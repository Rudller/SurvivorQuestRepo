import type { Metadata } from "next";
import { GalleryView } from "@/features/gallery/components/gallery-view";

export const metadata: Metadata = {
  title: "Galeria zdjęć | SQ-Events",
  description: "Zdjęcia z realizacji SQ-Events — dostęp chroniony kodem realizacji.",
  robots: {
    index: false,
    follow: false,
  },
};

type GalleryPageProps = {
  params: Promise<{ realizationId: string }>;
};

export default async function GalleryPage({ params }: GalleryPageProps) {
  const { realizationId } = await params;

  return <GalleryView realizationId={realizationId} />;
}
