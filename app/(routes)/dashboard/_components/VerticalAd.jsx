"use client";
import { useEffect } from "react";

const VerticalAd = () => {
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error("Adsense error:", e);
    }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block" }}
      data-ad-client="ca-pub-9174140322510860"
      data-ad-slot="5320699690"
      data-ad-format="auto"
      data-full-width-responsive="true"
    ></ins>
  );
};

export default VerticalAd;
