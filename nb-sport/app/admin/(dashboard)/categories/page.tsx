"use client";

import { useEffect, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { Plus, Trash2, Upload, type LucideIcon } from "lucide-react";
import type { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";

const ICON_OPTIONS = ["Dumbbell", "Footprints", "Shirt", "Volleyball", "Backpack", "Watch", "Zap", "HeartPulse", "Tag"];

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [nom, setNom] = useState("");
  const [icone, setIcone] = useState(ICON_OPTIONS[0]);
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        setCategories(data);
        setLoading(false);
      });
  }, []);

  async function handleFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "categories");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) setImage(data.url);
    } finally {
      setUploading(false);
    }
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, icone, image }),
    });
    const created = await res.json();
    setCategories((prev) => [...prev, created]);
    setNom("");
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function deleteCategory(id: string) {
    if (!confirm("Supprimer cette catégorie ?")) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="nb-card overflow-hidden">
        <div className="border-b border-border p-4">
          <p className="text-sm text-muted">{loading ? "Chargement..." : `${categories.length} catégories`}</p>
        </div>
        <div className="divide-y divide-border">
          {categories.map((cat) => {
            const Icon = (Icons as unknown as Record<string, LucideIcon>)[cat.icone] ?? Icons.Tag;
            return (
              <div key={cat.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-accent/10">
                    {cat.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cat.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Icon className="h-5 w-5 text-accent-strong" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{cat.nom}</p>
                    <p className="text-xs text-muted">/{cat.slug}</p>
                  </div>
                </div>
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={addCategory} className="nb-card h-fit p-5">
        <h3 className="mb-4 text-sm font-bold">Nouvelle catégorie</h3>
        <div className="flex flex-col gap-3">
          <input
            placeholder="Nom de la catégorie"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="h-11 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
          />
          <select
            value={icone}
            onChange={(e) => setIcone(e.target.value)}
            className="h-11 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent-strong"
          >
            {ICON_OPTIONS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files)}
          />
          {image ? (
            <div className="relative h-20 w-20 overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="h-full w-full object-cover" />
            </div>
          ) : (
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm font-medium text-muted transition-colors hover:border-accent-strong hover:text-accent-strong disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Envoi..." : "Ajouter une image (optionnel)"}
            </button>
          )}

          <Button type="submit">
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>
      </form>
    </div>
  );
}
