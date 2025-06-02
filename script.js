import { WebUploader } from "https://cdn.jsdelivr.net/npm/@irys/web-upload@0.0.15/+esm";
import { WebEthereum } from "https://cdn.jsdelivr.net/npm/@irys/web-upload-ethereum@0.0.16/+esm";
import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.7.2/+esm";

let irys;

const getIrysUploader = async () => {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  irys = await WebUploader(WebEthereum).withProvider(provider);
  console.log("Connected to Irys:", irys.address);
  document.getElementById("output").innerText = `Connected to Irys as ${irys.address}`;
};

document.getElementById("connect").onclick = getIrysUploader;

document.getElementById("upload").onclick = async () => {
  if (!irys) {
    alert("Please connect your wallet first.");
    return;
  }

  const confession = document.getElementById("confession").value.trim();
  if (!confession) {
    alert("Please write a confession before uploading.");
    return;
  }

  try {
    const result = await irys.upload(confession);
    console.log("Upload complete:", result);
    document.getElementById("output").innerHTML = `
      ✅ Uploaded to <a href="https://gateway.irys.xyz/${result.id}" target="_blank">${result.id}</a>
    `;
  } catch (e) {
    console.error("Upload failed", e);
    alert("Upload failed, check console.");
  }
};
