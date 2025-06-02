import { WebUploader } from "https://cdn.jsdelivr.net/npm/@irys/web-upload@0.0.15/+esm";
import { WebEthereum } from "https://cdn.jsdelivr.net/npm/@irys/web-upload-ethereum@0.0.16/+esm";
import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.7.2/+esm";

let irys = null;

document.getElementById("connect").onclick = async () => {
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    irys = await WebUploader(WebEthereum).withProvider(provider);
    alert("Connected as " + irys.address);
  } catch (err) {
    console.error("Wallet connect failed:", err);
    alert("Connection failed");
  }
};

document.getElementById("upload").onclick = async () => {
  if (!irys) {
    alert("Connect wallet first!");
    return;
  }

  const message = document.getElementById("confession").value.trim();
  if (!message) {
    alert("Enter a confession first!");
    return;
  }

  try {
    const receipt = await irys.upload(message);
    console.log("Uploaded at:", `https://gateway.irys.xyz/${receipt.id}`);
    alert("Uploaded!\n" + `https://gateway.irys.xyz/${receipt.id}`);
  } catch (err) {
    console.error("Upload failed:", err);
    alert("Upload failed");
  }
};
