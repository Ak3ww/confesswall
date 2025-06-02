import { WebUploader } from "https://esm.sh/@irys/web-upload@0.0.15";
import { WebEthereum } from "https://esm.sh/@irys/web-upload-ethereum@0.0.16";
import { ethers } from "https://esm.sh/ethers@5.7.2";

const IRYS_RPC = "https://testnet-rpc.irys.xyz/v1/execution-rpc";

let irys;

const getIrysUploader = async () => {
  const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
  await provider.send("eth_requestAccounts", []);
  const network = await provider.getNetwork();
  console.log("Connected to chain:", network.chainId);

  irys = await WebUploader(WebEthereum)
    .withProvider(provider)
    .withRpc(IRYS_RPC)
    .devnet();

  console.log("Irys address:", irys.address);
};

document.getElementById("connect").onclick = async () => {
  try {
    await getIrysUploader();
    alert("Wallet connected and Irys ready.");
  } catch (e) {
    console.error("Connection error", e);
    alert("Failed to connect.");
  }
};

document.getElementById("submit").onclick = async () => {
  const message = document.getElementById("confession").value;
  if (!message || !irys) {
    alert("Connect wallet and write a message first.");
    return;
  }

  try {
    const result = await irys.upload(message);
    alert("Submitted: https://gateway.irys.xyz/" + result.id);
  } catch (e) {
    console.error("Upload error", e);
    alert("Upload failed.");
  }
};
