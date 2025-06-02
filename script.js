import { WebUploader } from "https://cdn.jsdelivr.net/npm/@irys/web-upload@0.0.15/+esm";
import { WebEthereum } from "https://cdn.jsdelivr.net/npm/@irys/web-upload-ethereum@0.0.16/+esm";
import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.7.2/+esm";

const getIrysUploader = async () => {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const irysUploader = await WebUploader(WebEthereum).withProvider(provider);
  return irysUploader;
};

const upload = async () => {
  const irys = await getIrysUploader();
  console.log("Connected to Irys:", irys.address);

  const result = await irys.upload("Hello from Irys!");
  console.log("Upload success:", `https://gateway.irys.xyz/${result.id}`);
};

document.getElementById("connect").onclick = upload;
