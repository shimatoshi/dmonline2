// migration.js
// This script migrates existing Firestore deck and library data
// from storing direct image URLs to storing card IDs that
// reference the new central card server.

const admin = require('firebase-admin');

// --- Firebase Admin SDK Initialization ---
// IMPORTANT: You need to set up your Firebase Admin SDK credentials.
// 1. Go to your Firebase project console.
// 2. Project settings -> Service accounts.
// 3. Generate a new private key. This will download a JSON file.
// 4. Place this JSON file securely (e.g., in the the dmonline2 directory)
//    and update the path below.
//    DO NOT commit this file to public repositories!
const serviceAccount = require('firebase.json'); // <--- UPDATE THIS PATH

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Optionally, specify your database URL if needed for RTDB
  // databaseURL: "https://your-project-id.firebaseio.com"
});

const db = admin.firestore();

// --- Central Card Server Configuration ---
const CARD_SERVER_URL = "http://127.0.0.1:5001"; // Or your deployed server URL

async function migrateUserData() {
    console.log("Starting data migration...");

    try {
        // --- Step 1: Get all users ---
        // In a real scenario, you might iterate through authentication users or
        // simply query documents in the 'users' collection if you know their UIDs.
        // For this example, we assume we want to process all documents directly under 'users'.
        const usersSnapshot = await db.collection('users').get();

        for (const userDoc of usersSnapshot.docs) {
            const uid = userDoc.id;
            console.log(`Processing user: ${uid}`);

            // --- Step 2: Migrate Decks ---
            const decksRef = db.collection('users').doc(uid).collection('decks');
            const decksSnapshot = await decksRef.get();

            for (const deckDoc of decksSnapshot.docs) {
                const deckId = deckDoc.id;
                const deckData = deckDoc.data();
                console.log(`  Processing deck: ${deckData.name || deckId}`);

                if (deckData.cards && Array.isArray(deckData.cards)) {
                    const oldCardUrls = deckData.cards;
                    const newCardIds = [];
                    let deckUpdated = false;

                    for (const cardUrl of oldCardUrls) {
                        // Extract card ID (filename) from URL
                        const cardFilename = cardUrl.split('/').pop().split('?')[0]; // Handles query params
                        if (!cardFilename) {
                            console.warn(`    Skipping invalid card URL in deck ${deckId}: ${cardUrl}`);
                            continue;
                        }
                        const cardId = cardFilename; // For now, filename is the ID

                        // Check if card is already in our central server (and cache if not)
                        try {
                            const addCardResponse = await fetch(`${CARD_SERVER_URL}/api/add_card`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    card_id: cardId,
                                    name: cardId, // Placeholder, can be improved later
                                    image_url: cardUrl
                                })
                            });
                            const addCardResult = await addCardResponse.json();
                            if (!addCardResponse.ok) {
                                console.error(`    Failed to add card ${cardId} to central server:`, addCardResult);
                            } else {
                                console.log(`    Card ${cardId} processed by central server.`);
                            }
                        } catch (fetchError) {
                            console.error(`    Error communicating with central server for ${cardId}: ${fetchError.message}`);
                        }
                        
                        newCardIds.push(cardId);
                        if (cardId !== cardUrl) { // Only mark as updated if we actually changed the format
                            deckUpdated = true;
                        }
                    }

                    if (deckUpdated) {
                        await decksRef.doc(deckId).update({ cards: newCardIds });
                        console.log(`  Deck ${deckId} updated with new card IDs.`);
                    } else {
                        console.log(`  Deck ${deckId} already up-to-date or no changes needed.`);
                    }
                }
            }

            // --- Step 3: Migrate Library (similar logic) ---
            const libraryRef = db.collection('users').doc(uid).collection('library');
            const librarySnapshot = await libraryRef.get();

            for (const cardDoc of librarySnapshot.docs) {
                const cardRef = libraryRef.doc(cardDoc.id);
                const cardData = cardDoc.data();

                if (cardData.url) { // Assuming 'url' field holds the image URL
                    const oldCardUrl = cardData.url;
                    const cardFilename = oldCardUrl.split('/').pop().split('?')[0];
                    if (!cardFilename) {
                        console.warn(`    Skipping invalid card URL in library ${cardDoc.id}: ${oldCardUrl}`);
                        continue;
                    }
                    const cardId = cardFilename;

                    // Ensure card is in central server
                    try {
                        const addCardResponse = await fetch(`${CARD_SERVER_URL}/api/add_card`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                card_id: cardId,
                                name: cardData.name || cardId, // Use existing name if available
                                image_url: oldCardUrl
                            })
                        });
                        const addCardResult = await addCardResponse.json();
                        if (!addCardResponse.ok) {
                            console.error(`    Failed to add library card ${cardId} to central server:`, addCardResult);
                        } else {
                            console.log(`    Library card ${cardId} processed by central server.`);
                        }
                    } catch (fetchError) {
                        console.error(`    Error communicating with central server for library card ${cardId}: ${fetchError.message}`);
                    }

                    if (oldCardUrl !== cardId) { // Only update if needed
                        await cardRef.update({ url: cardId });
                        console.log(`  Library card ${cardDoc.id} updated from URL to ID.`);
                    } else {
                        console.log(`  Library card ${cardDoc.id} already up-to-date or no changes needed.`);
                    }
                }
            }
        }

        console.log("Data migration completed successfully!");
    } catch (error) {
        console.error("Error during migration:", error);
    } finally {
        // Exit the script cleanly
        process.exit();
    }
}

migrateUserData();
