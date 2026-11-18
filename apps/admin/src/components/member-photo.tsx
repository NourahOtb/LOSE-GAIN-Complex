"use client";

import { useRef, useState, useTransition } from "react";

import { removeMemberPhoto, saveMemberPhoto } from "@/app/actions";

/** Shrink a photo to a 600px square JPEG in the browser before uploading. */
async function shrink(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const side = Math.min(img.width, img.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 600;
  canvas.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 600, 600);
  return await new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.8));
}

/** Member photo: take one with the tablet camera or choose a file; remove. */
export function MemberPhoto({ kidId, name, url }: { kidId: string; name: string; url: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-3">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-24 w-24 rounded-full object-cover" />
      ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-tile text-2xl font-semibold text-swim">{initials}</div>
      )}
      <div className="flex flex-col gap-1.5 text-sm">
        <input
          ref={input}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setMsg("");
            start(async () => {
              const blob = await shrink(file);
              const fd = new FormData();
              fd.append("photo", new File([blob], "photo.jpg", { type: "image/jpeg" }));
              const r = await saveMemberPhoto(kidId, fd);
              setMsg(r.error ?? r.ok ?? "");
            });
            e.target.value = "";
          }}
        />
        <button onClick={() => input.current?.click()} disabled={pending} className="h-9 rounded border-[1.5px] border-ink px-3 font-semibold disabled:opacity-50">
          {pending ? "Saving…" : url ? "Change photo" : "Take or add photo"}
        </button>
        {url ? (
          <button onClick={() => start(async () => setMsg((await removeMemberPhoto(kidId)).ok ?? ""))} disabled={pending} className="text-left underline underline-offset-2">
            Remove photo
          </button>
        ) : null}
        {msg ? <span className="text-ink-soft">{msg}</span> : null}
      </div>
    </div>
  );
}
