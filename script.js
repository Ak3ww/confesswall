import { WebUploader } from "https://unpkg.com/@irys/web-upload@latest/dist/index.mjs";
import { WebEthereum } from "https://unpkg.com/@irys/web-upload-ethereum@latest/dist/index.mjs";

let irys = null;

window.connectWallet = async function () {
  console.log("🔌 Connecting...");
  if (!window.ethereum) {
    alert("MetaMask not found!");
    return;
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = provider.getSigner();
  const address = await signer.getAddress();
  document.querySelector("button").innerText = `✅ Connected: ${address.slice(0, 6)}...`;

  irys = await WebUploader(WebEthereum).withProvider(provider);
  console.log("✅ Connected to Irys", irys.address);
  document.getElementById("mainUI").style.display = "block";
};

window.uploadConfession = async function () {
  if (!irys) {
    alert("Connect your wallet first!");
    return;
  }

  const message = document.getElementById("confession").value.trim();
  if (!message) {
    alert("Please type something to confess.");
    return;
  }

  try {
    const receipt = await irys.upload(message, {
      tags: [{ name: "App-Name", value: "ConfessWall" }],
    });

    const link = `https://gateway.irys.xyz/${receipt.id}`;
    document.getElementById("confessionLink").innerHTML = `✅ Uploaded! <br><a href="${link}" target="_blank">${link}</a>`;
    document.getElementById("confession").value = "";
  } catch (err) {
    console.error(err);
    alert("Upload failed.");
  }
};
