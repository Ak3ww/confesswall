import { useState } from 'react';
import { ethers } from 'ethers';
import { WebIrys } from '@irys/sdk';

export default function Home() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [irys, setIrys] = useState(null);
  const [confession, setConfession] = useState('');
  const [status, setStatus] = useState('');

  const IRYS_RPC = 'https://testnet-rpc.irys.xyz/v1/execution-rpc';
  const IRYS_CHAIN = {
    chainId: '0x4F6', // 1270 in hex
    chainName: 'Irys Testnet',
    nativeCurrency: { name: 'IRYS', symbol: 'IRYS', decimals: 18 },
    rpcUrls: [IRYS_RPC],
    blockExplorerUrls: ['https://testnet-explorer.irys.xyz']
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) throw new Error('No MetaMask found');

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [IRYS_CHAIN]
        });
      } catch (e) {
        console.warn('Could not add chain, maybe already added');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      const irysInstance = new WebIrys({
        wallet: window.ethereum,
        rpcUrl: IRYS_RPC,
        chain: 'ethereum',
      });

      await irysInstance.ready();

      setIrys(irysInstance);
      setWalletAddress(address);
      setStatus('Wallet connected ✅');
    } catch (err) {
      console.error('Connect error:', err);
      setStatus('❌ Failed to connect');
    }
  };

  const uploadConfession = async () => {
    if (!irys || !walletAddress) return setStatus('⚠️ Connect wallet first');

    try {
      const receipt = await irys.upload(confession);
      const url = `https://gateway.irys.xyz/${receipt.id}`;
      console.log('Uploaded to:', url);
      setStatus(`✅ Uploaded: ${url}`);
      setConfession('');
    } catch (err) {
      console.error('Upload error:', err);
      setStatus('❌ Upload failed');
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Irys Confession Wall</h1>
      <button onClick={connectWallet}>Connect Wallet</button>
      <p>Wallet: {walletAddress || 'Not connected'}</p>
      <p>Status: {status}</p>

      <textarea
        value={confession}
        onChange={(e) => setConfession(e.target.value)}
        placeholder="Write your confession..."
        style={{ width: '100%', height: 120, marginTop: 20 }}
      />
      <button onClick={uploadConfession} style={{ marginTop: 10 }}>
        Upload Confession
      </button>
    </div>
  );
}
