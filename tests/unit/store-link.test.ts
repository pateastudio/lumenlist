import { createElement, type ReactElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { initialGifts, ownGiftsOf, PEOPLE, VIEWER } from "@/components/marketing/demo/family"

// A gift's store link is a real link in the app and a button with no address on the marketing
// page's examples (inside a claim transport provider), so an example can never lead to a store.

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {}, push() {} }) }))

const { ClaimTransportContext } = await import("@/components/gifts/claim-transport")
const { StoreLink } = await import("@/components/gifts/store-link")
const { TheirGiftCard } = await import("@/components/gifts/their-gift-card")
const { OwnGiftCard } = await import("@/components/gifts/own-gift-card")

const asExample = (el: ReactElement) => createElement(ClaimTransportContext.Provider, { value: async () => true }, el)
const link = createElement(StoreLink, { href: "https://www.homedepot.com/tulip-mix", className: "store" }, "homedepot.com")

const tulips = initialGifts().find((g) => g.url?.includes("homedepot.com"))!
const theirs = createElement(TheirGiftCard, { gift: tulips, currentUserId: VIEWER.id, ownerName: "Nora" })
const headphones = ownGiftsOf(initialGifts(), "sam").find((g) => g.url)!
const own = createElement(OwnGiftCard, { gift: headphones })

describe("a gift's store link", () => {
  it("is a link that opens the store in a new tab in the app", () => {
    expect(renderToStaticMarkup(link)).toBe(
      '<a href="https://www.homedepot.com/tulip-mix" target="_blank" rel="noopener noreferrer" class="store">homedepot.com</a>',
    )
  })

  it("is a button with no address on an example", () => {
    expect(renderToStaticMarkup(asExample(link))).toBe('<button type="button" data-example-link="true" class="store">homedepot.com</button>')
  })

  it("someone's card: a link in the app, and no trace of the address on an example", () => {
    const app = renderToStaticMarkup(theirs)
    expect(app).toContain(`<a href="${tulips.url}" target="_blank" rel="noopener noreferrer"`)
    expect(app).not.toContain("data-example-link")

    const example = renderToStaticMarkup(asExample(theirs))
    expect(example).toContain("data-example-link")
    expect(example).toContain("homedepot.com</span></button>")
    expect(example).not.toMatch(/<a\b|href=|www\.homedepot|tulip-mix/)
  })

  it("your own card: a link in the app, and no trace of the address on an example", () => {
    expect(PEOPLE.sam.id).toBe(headphones.owner_id)
    const app = renderToStaticMarkup(own)
    expect(app).toContain(`<a href="${headphones.url}" target="_blank" rel="noopener noreferrer"`)
    expect(app).toContain("(opens the store in a new tab)")

    const example = renderToStaticMarkup(asExample(own))
    expect(example).toContain("data-example-link")
    expect(example).toContain(">sony.com</span>")
    expect(example).not.toMatch(/<a\b|href=|www\.sony|headband|new tab/)
  })
})
