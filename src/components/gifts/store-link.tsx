"use client"

import { useContext } from "react"
import { ClaimTransportContext } from "./claim-transport"

/** True inside the marketing page's made-up family (it is what provides a claim transport), never in the signed-in app. */
export function useIsExample(): boolean {
  return useContext(ClaimTransportContext) !== null
}

/**
 * A gift's way to its store. In the app it is a link that opens the store in a new tab. On an
 * example card it is a button that looks the same and holds no address at all, so nothing (a
 * right-click, a click before the page is ready) can lead a visitor off to a real store.
 * `DemoFamily` answers a click on it with a toast.
 */
export function StoreLink({ href, ...rest }: { href: string } & Omit<React.ComponentProps<"a">, "href" | "target" | "rel">) {
  const example = useIsExample()
  if (example) return <button type="button" data-example-link {...(rest as React.ComponentProps<"button">)} />
  return <a href={href} target="_blank" rel="noopener noreferrer" {...rest} />
}
