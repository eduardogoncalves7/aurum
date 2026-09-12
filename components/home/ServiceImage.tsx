"use client";

import { useState } from "react";
import { Service } from "@/types";
import { getServiceImagePath } from "@/lib/data/services";
import { cn } from "@/lib/utils";

export function ServiceImage({
  service,
  className,
}: {
  service: Service;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = getServiceImagePath(service);

  if (failed) {
    return (
      <div
        className={cn(
          "bg-gradient-to-br from-gold/15 via-background-elevated to-background",
          className
        )}
        aria-hidden
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- catálogo dinâmico com fallback próprio; não dá pra usar import estático do next/image
    <img
      src={src}
      alt={service.name}
      className={cn("h-full w-full object-cover", className)}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
