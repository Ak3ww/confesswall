import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { Uploader } from '@irys/upload'
import { Ethereum } from '@irys/upload-ethereum'

export default function Home() {
  const [signer, setSigner] = useState(null)
  const [walletAddress, setWalletAddress] = useState(null)
  const [irys, setIrys] = useState(null)
  const [confession, setConfession] = useState('')
  const [status, setStatus] = useState('')

  const IRYS_RPC = 'https://testnet-rpc.irys.xyz/v1/execution-rpc'

  const connectWallet = async () => {
    try {
      if (!window.ethereum) throw new Error('No wallet found')
      await window.ethereum.request({ method: 'eth_requestAccounts' })

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      setSigner(signer)
      setWalletAddress(address)
      setStatus('Wallet connected')

      // Setup Irys Uploader using Devnet RPC
      const uploader = await Uploader(Ethereum)
        .withWallet(signer)
        .withRpc(IRYS_RPC)
        .devnet()

      setIrys(uploader)
    } catch (err) {
      console.error('Connect error:', err)
      setStatus('Connection failed')
    }
  }

  const uploadConfession = async () => {
    if (!irys || !walletAddress) return setStatus('Connect wallet first')
    try {
      const data = JSON.stringify({ confession, from: walletAddress })
      const tx = await irys.upload(data)
      setStatus(`Uploaded: https://gateway.irys.xyz/${tx.id}`)
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
