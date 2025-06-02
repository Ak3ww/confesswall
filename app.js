import { WebUploader } from "https://esm.sh/@irys/web-upload@0.0.15";
import { WebEthereum } from "https://esm.sh/@irys/web-upload-ethereum@0.0.16";
import { ethers } from "https://esm.sh/ethers@5.7.2";

const getIrysUploader = async () => {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const irys = await WebUploader(WebEthereum).withProvider(provider);
  return irys;
};

const uploadToIrys = async () => {
  try {
    const irys = await getIrysUploader();
    console.log("Connected to Irys as:", irys.address);

    const result = await irys.upload("Hello Irys from browser!");
    console.log("Upload complete:", `https://gateway.irys.xyz/${result.id}`);
    alert(`Upload success!\n${result.id}`);
  } catch (e) {
    console.error("Upload failed", e);
    alert("Upload failed. See console.");
  }
};

document.getElementById("connect").onclick = uploadToIrys;
