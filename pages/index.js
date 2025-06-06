import { ethers } from 'ethers';
import { WebUploader } from '@irys/web-upload';
import { WebEthereum } from '@irys/web-upload-ethereum';
import { EthersV6Adapter } from '@irys/web-upload-ethereum-ethers-v6';

export default function Home() {
  const connectIrys = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const irys = await WebUploader(WebEthereum).withAdapter(EthersV6Adapter(provider));
    console.log("Connected to Irys:", irys.address);
  };

  return (
    <main>
      <button onClick={connectIrys}>Connect to Irys</button>
    </main>
  );
}
