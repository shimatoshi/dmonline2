import { useState } from "react";
import CardRegister from "../components/CardRegister";
import CardLibrary from "../components/CardLibrary";
import { useLibrary } from "../hooks/useLibrary";

export default function CardLibraryPage() {
  const { library, allExistingTags, registerCard, deleteCard, updateCard } = useLibrary();
  const [statusMsg, setStatusMsg] = useState("");

  const handleRegister = async (name, url, tags, cost, faces) => {
    await registerCard(name, url, tags, cost, faces);
    setStatusMsg("登録しました");
    setTimeout(() => setStatusMsg(""), 2000);
  };

  return (
    <div style={{ padding: "10px", maxWidth: "800px", margin: "0 auto", paddingBottom: "80px" }}>
      <h2 style={{ borderBottom: "1px solid #333", paddingBottom: "10px", color: "#e0e0e0", marginBottom: "15px" }}>カード図鑑</h2>

      {statusMsg && <div style={{ color: "#42a5f5", fontSize: "0.85rem", marginBottom: "10px" }}>{statusMsg}</div>}

      <CardRegister onRegister={handleRegister} existingTags={allExistingTags} />

      <hr style={{ margin: "20px 0", borderTop: "1px solid #333" }} />

      <CardLibrary
        library={library}
        onDelete={deleteCard}
        onUpdate={updateCard}
        existingTags={allExistingTags}
      />
    </div>
  );
}
