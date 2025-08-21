import React, { useState, useRef, useEffect } from "react";
import { Upload, Send, X } from "lucide-react";
import "../App.css";

export default function DoclingConverter() {
  const [file, setFile] = useState(null);
  const [convertedMarkdown, setConvertedMarkdown] = useState("");
  const [docId, setDocId] = useState(null);           // << novo
  const [convertedJSON, setConvertedJSON] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [asking, setAsking] = useState(false);

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setConvertedMarkdown("");
    setDocId(null);
    setConvertedJSON(null);
  };

  const handleConvert = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/convert", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      const md = data.markdown || "";
      setConvertedMarkdown(md);
      setConvertedJSON(data.json || null);

      
      const resStore = await fetch("http://localhost:8000/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: md }),
      });
      const { id } = await resStore.json();
      setDocId(id);

     
      localStorage.setItem(id, md);

      if (md) setShowChatModal(true);
    } catch (err) {
      console.error("Erro ao converter:", err);
    } finally {
      setLoading(false);
    }
  };

const sendMessage = async () => {
  if (!question.trim() || !docId) return;

  const userMsg = { text: question, sender: "user" };
  setMessages((prev) => [...prev, userMsg]);
  setQuestion("");
  setAsking(true);

  try {
    const markdown = localStorage.getItem(docId);
    if (!markdown) {
      throw new Error("O conteúdo do documento não foi encontrado no localStorage.");
    }

    
    const response = await fetch("https://n8n.memt.com.br/webhook-test/637af59b-a97b-450b-8d15-52607b2d6aa5", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        docId,
        pergunta: userMsg.text,
        conteudo: markdown, 
      }),
    });

    const data = await response.json();
    const reply = data.resposta || data.output || "⚠️ Não foi possível obter resposta.";
    setMessages((prev) => [...prev, { text: reply, sender: "bot" }]);
  } catch (err) {
    console.error("Erro ao consultar:", err);
    setMessages((prev) => [...prev, { text: "❌ Erro ao consultar a IA.", sender: "bot" }]);
  } finally {
    setAsking(false);
  }
};



  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-50 flex flex-col items-center p-6">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-xl">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">📄 Conversor Docling</h2>
        <input type="file" onChange={handleFileChange} className="w-full border rounded px-4 py-2 mb-4" />
        <button
          onClick={handleConvert}
          disabled={!file || loading}
          className="w-full flex justify-center items-center gap-2 bg-blue-600 text-white font-medium py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Convertendo..." : (<><Upload size={16} /> Converter Documento</>)}
        </button>
      </div>

      {showChatModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl flex flex-col h-[85vh]">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b bg-blue-600 text-white rounded-t-xl">
              <h3 className="font-bold text-lg">💬 Chat com a IA</h3>
              <button onClick={() => setShowChatModal(false)} className="hover:text-red-300"><X /></button>
            </div>

            {/* Chat body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`max-w-[80%] px-4 py-2 rounded-xl text-sm whitespace-pre-wrap break-words ${msg.sender === "user" ? "bg-blue-600 text-white self-end ml-auto" : "bg-gray-200 text-gray-800 self-start mr-auto"
                    }`}
                >
                  {msg.text}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex items-center gap-2 bg-white rounded-b-xl">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Digite sua pergunta..."
                className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                onClick={sendMessage}
                disabled={asking || !docId}
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full disabled:opacity-60"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
