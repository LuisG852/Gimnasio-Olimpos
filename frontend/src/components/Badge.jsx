import React from "react";
const ESTILOS = {
  good: "bg-goodbg text-good",
  warn: "bg-warnbg text-warn",
  bad: "bg-badbg text-bad",
};

export default function Badge({ tone, children }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${ESTILOS[tone]}`}>
      {children}
    </span>
  );
}
