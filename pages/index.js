import { useState } from 'react'
import { ethers } from 'ethers'
import { WebIrys } from '@irys/sdk'

export default function Home() {
  const [walletAddress, setWalletAddress] = useState('')
  const [status, setStatus] = useState('')
  const [confession, setConfession] = useState('')
  const [irys, setIrys] = useState(null)

  const IRYS_CHAIN = {
    chainId: '0x4F6', // 1270 in hex
    chainName: 'Irys Testnet',
    nativeCurrency: {
      name: 'tIRYS',
      symbol: 'tIRYS',
      decimals: 18
    },
    rpcUrls: ['https://testnet-rpc.irys.xyz/v1/execution-rpc'],
    blockExplorerUrls: ['https://testnet-explorer.irys.xyz']
  }

  const connectWallet = async () => {
    try {
      if (!window.ethereum) return alert('MetaMask not found.')

      await window.ethereum.request({ method: 'eth_requestAccounts' })

      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [IRYS_CHAIN]
        })
      } catch {
        console.log('Could not add chain, maybe already added')
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      setWalletAddress(address)
      setStatus('Wallet connected')

      const irysInstance = new WebIrys({
        url: 'https://devnet.irys.xyz', // use devnet for testnet interactions
        provider: window.ethereum,
        token: 'ethereum'
      })

      await irysInstance.ready()
      setIrys(irysInstance)
    } catch (err) {
      console.error('Connect error:', err)
      setStatus('Connection failed')
    }
  }

  const uploadConfession = async () => {
    if (!irys) return setStatus('Please connect wallet first')

    try {
      const data = JSON.stringify({ confession })
      const res = await irys.upload(data, { tags: [{ name: 'App', value: 'IrysConfessionWall' }] })
      setStatus(`✅ Uploaded: ${res.id}`)
      setConfession('')
    } catch (err) {
      console.error('Upload error:', err)
      setStatus('❌ Upload failed')
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Irys Confession Wall</h1>
      <p>Status: {status}</p>
      <button onClick={connectWallet}>Connect Wallet</button>
      {walletAddress && <p>Connected: {walletAddress}</p>}
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
