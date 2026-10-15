"use client"

import { createContext } from "react"

/**
 * How `ClaimActions` sends a claim change. With no provider it calls the claim API and refreshes
 * the page. The marketing page provides one that changes made-up data in memory, so the real
 * cards work for a visitor with no account and no network. Nothing in the signed-in app provides it.
 */
export type ClaimTransport = (giftId: string, method: "POST" | "PATCH" | "DELETE", status?: "claimed" | "purchased") => Promise<boolean>

export const ClaimTransportContext = createContext<ClaimTransport | null>(null)
