import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { bundlrStorageDriver } from '@irys/sdk'

export default function Home() {
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [walletAddress, setWalletAddress] = useState(null)
  const [irys, setIrys] = useState(null)
  const [confession, setConfession] = useState('')
  const [status, setStatus] = useState('')

  const IRYS_RPC = 'https://testnet-rpc.irys.xyz/v1/execution-rpc'
  const IRYS_CHAIN = {
    chainId: '0x14A34', // 84020
    chainName: 'Irys Testnet',
    nativeCurrency: { name: 'tIRYS', symbol: 'tIRYS', decimals: 18 },
    rpcUrls: [IRYS_RPC],
    blockExplorerUrls: ['https://explorer.irys.xyz']
  }

  const connectWallet = async () => {
    try {
      if (!window.ethereum) throw new Error('No wallet found')

      await window.ethereum.request({ method: 'eth_requestAccounts' })

      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [IRYS_CHAIN]
        })
      } catch (e) {
        console.log('Could not add chain, maybe already added')
      }

      const webProvider = new ethers.BrowserProvider(window.ethereum)
      const signerInstance = await webProvider.getSigner()
      const address = await signerInstance.getAddress()

      setProvider(webProvider)
      setSigner(signerInstance)
      setWalletAddress(address)
      setStatus('Wallet connected')

      const irysDriver = await bundlrStorageDriver({
        provider: window.ethereum,
        network: 'ethereum',
        rpcUrl: IRYS_RPC
      })

      setIrys(irysDriver)
    } catch (err) {
      console.error('Connect error:', err)
      setStatus('Connection failed')
    }
  }

  const uploadConfession = async () => {
    if (!irys || !walletAddress) return setStatus('Connect wallet first')

    try {
      const tx = await irys.upload(JSON.stringify({ confession }))
      setStatus(`Confession uploaded: ${tx.id}`)
      setConfession('')
    } catch (err) {
      console.error('Upload error:', err)
      setStatus('Upload failed')
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Irys Confession Wall</h1>
      <button onClick={connectWallet}>Connect Wallet</button>
      <p>Status: {status}</p>

      <textarea
        value={confession}
        onChange={(e) => setConfession(e.target.value)}
        placeholder="Write your confession..."
        style={{ width: '100%', height: 100, marginTop: 20 }}
      />
      <button onClick={uploadConfession} style={{ marginTop: 10 }}>
        Upload Confession
      </button>
    </div>
  )
}
