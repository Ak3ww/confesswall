import { supabase } from "../../lib/supabaseClient";
import { ethers } from "ethers";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { tx_id, address, signature } = req.body;

  if (!tx_id || !address || !signature) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const message = `Delete Confession with tx_id: ${tx_id}`;
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const { error } = await supabase
      .from("confessions")
      .delete()
      .eq("tx_id", tx_id)
      .eq("address", address);

    if (error) {
      console.error("Supabase delete error", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Verification or deletion error", err);
    return res.status(500).json({ error: err.message });
  }
}
