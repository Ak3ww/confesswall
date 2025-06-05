let uploader = null;

async function connectWallet() {
  try {
    if (!window.ethereum) {
      alert("MetaMask not found.");
      return;
    }

    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0x4f6",
          chainName: "Irys Testnet",
          nativeCurrency: {
            name: "IRYS",
            symbol: "IRYS",
            decimals: 18,
          },
          rpcUrls: ["https://testnet-rpc.irys.xyz/v1/execution-rpc"],
          blockExplorerUrls: ["https://testnet-explorer.irys.xyz"],
        }]
      });
    } catch (err) {
      console.warn("Could not add chain, maybe it's already added");
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();

    const ethWallet = new window.Irys.WebEthereum({
      name: "ethereum",
      provider,
      signer,
    });

    uploader = await window.Irys.WebUploader(ethWallet).ready();

    document.getElementById("connect").innerText = "✅ Connected";
    document.getElementById("connect").disabled = true;

    alert("✅ Wallet connected to Irys!");
  } catch (err) {
    console.error("Connect error:", err);
    alert("❌ Wallet connection failed.");
  }
}

async function uploadMessage() {
  if (!uploader) {
    alert("⚠️ Please connect wallet first.");
    return;
  }

  const msg = document.getElementById("message").value.trim();
  if (!msg) {
    alert("✏️ Write something to upload.");
    return;
  }

  try {
    const result = await uploader.upload(msg);
    alert(`✅ Uploaded!\nhttps://gateway.irys.xyz/${result.id}`);
  } catch (err) {
    console.error("Upload failed:", err);
    alert("❌ Upload failed. See console.");
  }
}

document.getElementById("connect").onclick = connectWallet;
document.getElementById("upload").onclick = uploadMessage;
