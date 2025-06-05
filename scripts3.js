let uploader = null;

async function connectWallet() {
  try {
    if (!window.ethereum) {
      alert("Please install MetaMask to use this dApp.");
      return;
    }

    // Safely add or switch to Irys Testnet
    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0x4f6", // 1270
          chainName: "Irys Testnet",
          nativeCurrency: {
            name: "IRYS",
            symbol: "IRYS",
            decimals: 18,
          },
          rpcUrls: ["https://testnet-rpc.irys.xyz/v1/execution-rpc"],
          blockExplorerUrls: ["https://testnet-explorer.irys.xyz"],
        }],
      });
    } catch (addError) {
      // Fallback to switch if chain already exists
      if (addError.code === -32603 || addError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x4f6" }],
        });
      } else {
        throw addError;
      }
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();

    const ethWallet = new IrysWebUploader.WebEthereum({
      name: "ethereum",
      provider,
      signer,
    });

    uploader = await IrysWebUploader.WebUploader(ethWallet).ready();

    document.getElementById("connect").innerText = "✅ Connected";
    document.getElementById("connect").disabled = true;
    alert("Wallet connected!");

  } catch (err) {
    console.error("Connect error:", err);
    alert("❌ Wallet connection failed.");
  }
}

async function uploadMessage() {
  const message = document.getElementById("message").value.trim();

  if (!uploader) {
    alert("Please connect your wallet first.");
    return;
  }

  if (!message) {
    alert("Please enter a message to upload.");
    return;
  }

  try {
    const tags = [{ name: "App", value: "IrysConfessionWall" }];
    const receipt = await uploader.upload(message, { tags });

    alert("✅ Message uploaded! TX ID: " + receipt.id);
    console.log("Uploaded to Irys:", receipt);
  } catch (err) {
    console.error("Upload failed:", err);
    alert("❌ Upload failed. See console for details.");
  }
}

// Event bindings
document.getElementById("connect").addEventListener("click", connectWallet);
document.getElementById("upload").addEventListener("click", uploadMessage);
