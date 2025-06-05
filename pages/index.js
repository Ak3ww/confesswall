const connectWallet = async () => {
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();

    try {
      await provider.send("wallet_addEthereumChain", [
        {
          chainId: "0x4f6", // 1270 hex
          chainName: "Irys Testnet",
          nativeCurrency: {
            name: "IRYS",
            symbol: "IRYS",
            decimals: 18,
          },
          rpcUrls: ["https://testnet-rpc.irys.xyz/v1/execution-rpc"],
          blockExplorerUrls: ["https://testnet-explorer.irys.xyz"],
        },
      ]);
    } catch (err) {
      console.warn("Could not add chain, maybe already added");
    }

    // 🧠 Patch: make signer compatible with Irys
    const patchedSigner = {
      getAddress: async () => await signer.getAddress(),
      signMessage: async (msg) => await signer.signMessage(msg),
    };

    const irysInstance = new Irys({
      network: "devnet",
      chain: "ethereum",
      signer: patchedSigner,
    });

    await irysInstance.ready();
    setIrys(irysInstance);
    setConnected(true);
  } catch (err) {
    console.error("Connect error:", err);
    alert("❌ Wallet connection failed.");
  }
};
