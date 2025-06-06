import { useState } from 'react'
import { ethers } from 'ethers'
import { Uploader } from '@irys/upload'
import { Ethereum } from '@irys/upload-ethereum'

export default function Home() {
  const [status, setStatus] = useState('')
  const [confession, setConfession] = useState('')
  const [walletAddress, setWalletAddress] = useState(null)
  const [irys, setIrys] = useState(null)

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setStatus('MetaMask not installed')
        return
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' })
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      setWalletAddress(address)
      setStatus(`Connected: ${address}`)

      const bundler = await Uploader(Ethereum)
        .withProvider(window.ethereum)
        .withRpc('https://testnet-rpc.irys.xyz/v1/execution-rpc') // Devnet RPC
        .devnet()

      setIrys(bundler)
    } catch (err) {
      console.error('Connect error:', err)
      setStatus('Wallet connection failed')
    }
  }

  const uploadConfession = async () => {
    if (!irys || !walletAddress) {
      setStatus('Connect wallet first')
      return
    }

    try {
      const res = await irys.upload(JSON.stringify({ confession }))
      setStatus(`Confession uploaded: ${res.id}`)
      setConfession('')
    } catch (err) {
      console.error('Upload error:', err)
      setStatus('Upload failed')
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Irys Confession Wall</h1>
      <button onClick={connectWallet}>Connect Wallet</button>
      <p>Status: {status}</p>

      <textarea
        value={confession}
        onChange={(e) => setConfession(e.target.value)}
        placeholder="Write your confession here..."
        style={{ width: '100%', height: '100px', marginTop: '20px' }}
      />
      <br />
      <button onClick={uploadConfession} style={{ marginTop: '10px' }}>
        Upload Confession
      </button>
    </div>
  )
}
