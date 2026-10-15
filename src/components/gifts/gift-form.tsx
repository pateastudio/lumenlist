"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronDown, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { TourHint } from "@/components/onboarding/steps/inline-hint"
import { GiftImage } from "@/components/shared/gift-image"
import type { Gift } from "@/types"
import { giftSchema, type GiftInput } from "@/lib/validations"

// People type "amazon.com/…" and "$25"; tidy those up instead of rejecting them. The API routes
// validate with the same giftSchema, so this happens in the form (on blur and again on submit).
const withScheme = (v: string) => {
  const t = v.trim()
  return t && !/^https?:\/\//i.test(t) ? `https://${t}` : t
}
const plainPrice = (v: string) => v.replace(/[$,\s]/g, "")

function isShowableImage(value: string | undefined) {
  if (!value) return false
  try {
    const u = new URL(value)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

interface GiftFormProps {
  gift?: Gift
}

export function GiftForm({ gift }: GiftFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [pasteUrl, setPasteUrl] = useState("")
  const [scraping, setScraping] = useState(false)
  const [showImage, setShowImage] = useState(!!gift?.image_url)
  const isEditing = !!gift

  const form = useForm<GiftInput>({
    resolver: zodResolver(giftSchema),
    defaultValues: {
      title: gift?.title ?? "",
      description: gift?.description ?? "",
      price: gift?.price?.toString() ?? "",
      url: gift?.url ?? "",
      image_url: gift?.image_url ?? "",
    },
  })

  const imageValue = useWatch({ control: form.control, name: "image_url" })?.trim()
  const titleValue = useWatch({ control: form.control, name: "title" })

  async function handleAutoFill() {
    const url = pasteUrl.trim()
    if (!url) return

    // Ensure the URL has a scheme so the fetch and validation succeed.
    const normalized = withScheme(url)

    setScraping(true)
    try {
      const res = await fetch("/api/gifts/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized }),
      })
      const json = await res.json()

      if (!res.ok) {
        // Still drop the link into the URL field so nothing is lost.
        form.setValue("url", normalized)
        toast.error(json.error ?? "Couldn't read that page — enter details manually.")
        return
      }

      const scraped = json.scraped as {
        title: string | null
        image_url: string | null
        price: string | null
        description: string | null
      }

      form.setValue("url", normalized)
      if (scraped.title) form.setValue("title", scraped.title, { shouldValidate: true })
      if (scraped.image_url) {
        form.setValue("image_url", scraped.image_url)
        setShowImage(true)
      }
      if (scraped.price) form.setValue("price", plainPrice(scraped.price))
      if (scraped.description && !form.getValues("description")) {
        form.setValue("description", scraped.description)
      }

      if (scraped.title || scraped.image_url) {
        toast.success("Filled in what we found — double-check before saving.")
      } else {
        toast.message("We couldn't find item details. Enter them manually below.")
      }
    } catch {
      form.setValue("url", normalized)
      toast.error("Couldn't reach that page — enter details manually.")
    } finally {
      setScraping(false)
    }
  }

  async function onSubmit(data: GiftInput) {
    setLoading(true)
    const url = isEditing ? `/api/gifts/${gift.id}` : "/api/gifts"
    const method = isEditing ? "PATCH" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      toast.error("Couldn't save the gift. Try again.")
      setLoading(false)
      return
    }

    toast.success(isEditing ? "Gift updated" : "Gift added to your list")
    router.push("/gifts")
    router.refresh()
  }

  // Tidy the values once more so pressing Enter without leaving a field still works.
  function tidyThenSubmit(e: React.FormEvent<HTMLFormElement>) {
    form.setValue("url", withScheme(form.getValues("url") ?? ""))
    form.setValue("image_url", withScheme(form.getValues("image_url") ?? ""))
    form.setValue("price", plainPrice(form.getValues("price") ?? ""))
    return form.handleSubmit(onSubmit)(e)
  }

  return (
    <div className="space-y-6">
      {!isEditing && (
        <section data-tour="gift-paste-link" className="rounded-xl bg-secondary p-4 text-secondary-foreground">
          <Label htmlFor="gift-paste" className="text-base font-bold">
            Got a link? Paste it here
          </Label>
          <p className="mt-0.5 text-sm opacity-80">
            We&apos;ll fill in the name, price and picture for you.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              id="gift-paste"
              inputMode="url"
              autoComplete="off"
              placeholder="amazon.com/…"
              value={pasteUrl}
              onChange={(e) => setPasteUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAutoFill()
                }
              }}
              disabled={scraping}
              className="h-12 bg-card text-base text-card-foreground sm:flex-1"
            />
            <Button
              type="button"
              size="lg"
              variant="ink-outline"
              onClick={handleAutoFill}
              disabled={scraping || !pasteUrl.trim()}
            >
              <Sparkles aria-hidden />
              {scraping ? "Looking…" : "Fill it in"}
            </Button>
          </div>
          <TourHint id="add">Got a link from a store? Paste it here and Lumen fills in the rest.</TourHint>
        </section>
      )}

      <Form {...form}>
        <form onSubmit={tidyThenSubmit} className="space-y-5" noValidate>
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">What is it?</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Blue knit sweater" className="h-12 text-base" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">
                  Price <span className="font-normal text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="49.99"
                    className="h-12 text-base"
                    {...field}
                    onBlur={(e) => {
                      field.onChange(plainPrice(e.target.value))
                      field.onBlur()
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">
                  Where to buy it <span className="font-normal text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    inputMode="url"
                    autoComplete="off"
                    placeholder="store.com/…"
                    className="h-12 text-base"
                    {...field}
                    onBlur={(e) => {
                      field.onChange(withScheme(e.target.value))
                      field.onBlur()
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">
                  Notes for your family <span className="font-normal text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Size, color, anything that helps"
                    className="min-h-24 text-base"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormDescription>These notes help family members pick the right version.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-3">
            {isShowableImage(imageValue) && (
              <div className="w-40">
                <GiftImage src={imageValue} title={titleValue || "Gift picture"} ratio="square" className="rounded-lg border border-border" />
              </div>
            )}
            {!showImage ? (
              <Button
                type="button"
                variant="link"
                className="h-11 px-0 text-base"
                onClick={() => setShowImage(true)}
              >
                <ChevronDown aria-hidden />
                Use a different picture
              </Button>
            ) : (
              <FormField
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">
                      Picture link <span className="font-normal text-muted-foreground">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        inputMode="url"
                        autoComplete="off"
                        placeholder="https://…"
                        className="h-12 text-base"
                        {...field}
                        value={field.value ?? ""}
                        onBlur={(e) => {
                          field.onChange(withScheme(e.target.value))
                          field.onBlur()
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-5 sm:flex-row-reverse sm:justify-start">
            <Button data-tour="gift-save" type="submit" size="lg" variant="ink" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Saving…" : isEditing ? "Save changes" : "Add to my list"}
            </Button>
            <Button asChild type="button" size="lg" variant="ghost" className="w-full sm:w-auto">
              <Link href="/gifts" prefetch={false}>
                Cancel
              </Link>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
