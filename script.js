import { Irys } from "https://esm.sh/@irys/sdk@0.5.3?bundle";

let irys = null;

async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask not found!");
    return;
  }

  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  const address = accounts[0];
  document.querySelector("button").innerText = `✅ Connected: ${address.slice(0, 6)}...`;

  irys = new Irys({
    network: "testnet",
    token: "ethereum",
    provider: window.ethereum,
  });

  document.getElementById("mainUI").style.display = "block";
}

async function uploadConfession() {
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
    alert("Upload failed. Check console.");
  }
}

// ✅ Bind to window so onclick="" works
window.connectWallet = connectWallet;
window.uploadConfession = uploadConfession;
