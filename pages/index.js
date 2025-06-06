import { useState } from "react";
import { WebUploader } from "@irys/web-upload";
import { WebEthereum } from "@irys/web-upload-ethereum";
import { EthersV6Adapter } from "@irys/web-upload-ethereum-ethers-v6";
import { ethers } from "ethers";

export default function Home() {
  const [irysUploader, setIrysUploader] = useState(null);
  const [uploadURL, setUploadURL] = useState("");

  const connectIrys = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const adapter = EthersV6Adapter(provider);
      const uploader = await WebUploader(WebEthereum).withAdapter(adapter);
      console.log("Connected:", uploader.address);
      setIrysUploader(uploader);
    } catch (err) {
      console.error("Connection error:", err);
    }
  };

  const uploadConfession = async () => {
    if (!irysUploader) return alert("Please connect first");
    try {
      const res = await irysUploader.upload("Hello Irys world!");
      const url = `https://gateway.irys.xyz/${res.id}`;
      console.log("Uploaded:", url);
      setUploadURL(url);
    } catch (err) {
      console.error("Upload error:", err);
    }
  };

  return (
    <main style={{ padding: 20 }}>
      <h1>Irys Confession Wall</h1>
      <button onClick={connectIrys}>Connect Irys</button>
      <button onClick={uploadConfession}>Upload Confession</button>
      {uploadURL && <p><a href={uploadURL} target="_blank">View confession</a></p>}
    </main>
  );
}
