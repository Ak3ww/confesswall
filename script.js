import { WebUploader } from "https://cdn.skypack.dev/@irys/web-upload";
import { WebEthereum } from "https://cdn.skypack.dev/@irys/web-upload-ethereum";

let irys = null;

async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask not found!");
    return;
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = provider.getSigner();
  const address = await signer.getAddress();
  document.getElementById("connectButton").innerText = `✅ ${address.slice(0, 6)}...`;

  irys = await WebUploader(WebEthereum).withProvider(provider);
  console.log("✅ Connected to Irys:", irys.address);
  document.getElementById("mainUI").style.display = "block";
}

async function uploadConfession() {
  if (!irys) {
    alert("Connect your wallet first!");
    return;
  }

  const message = document.getElementById("confession").value.trim();
  if (!message) {
    alert("Write something to upload.");
    return;
  }

  try {
    const receipt = await irys.upload(message, {
      tags: [{ name: "App-Name", value: "ConfessWall" }],
    });

    const link = `https://gateway.irys.xyz/${receipt.id}`;
    document.getElementById("confessionLink").innerHTML =
      `✅ Uploaded!<br><a href="${link}" target="_blank">${link}</a>`;
    document.getElementById("confession").value = "";
  } catch (err) {
    console.error(err);
    alert("Upload failed.");
  }
}

document.getElementById("connectButton").addEventListener("click", connectWallet);
document.getElementById("uploadButton").addEventListener("click", uploadConfession);
