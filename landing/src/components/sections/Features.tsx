"use client"

import {
  LayoutDashboard,
  Code2,
  Palette,
  ShieldCheck,
  Rocket,
  Smartphone,
} from "lucide-react"

import FadeIn from "@/components/ui/FadeIn"

export default function Features() {
  const items = [
    {
      title: "ShadCN Powered",
      desc: "Built using modern ShadCN UI components and Radix primitives.",
      icon: LayoutDashboard,
    },
    {
      title: "Production Ready",
      desc: "Clean architecture, scalable folder structure and reusable components.",
      icon: Code2,
    },
    {
      title: "Fully Responsive",
      desc: "Optimized for desktop, tablet and mobile devices.",
      icon: Smartphone,
    },
    {
      title: "Modern Design",
      desc: "Carefully crafted UI with clean typography and spacing.",
      icon: Palette,
    },
    {
      title: "Secure & Reliable",
      desc: "Built with best practices and security-first approach.",
      icon: ShieldCheck,
    },
    {
      title: "Blazing Fast",
      desc: "Optimized performance with lightweight components.",
      icon: Rocket,
    },
  ]

  return (
    <section id="features" className="py-24 bg-white">
      <div className="container-custom text-center">
        
        <FadeIn>
          <h2 className="text-4xl font-bold">
            Built for Modern Developers
          </h2>
        </FadeIn>

        <FadeIn>
          <p className="mt-6 text-gray-600 max-w-2xl mx-auto">
            Pulse UI is crafted for developers who want flexibility,
            scalability and clean code.
          </p>
        </FadeIn>

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {items.map((item, i) => {
            const Icon = item.icon

            return (
              <FadeIn key={i}>
                <div className="group p-8 border rounded-2xl hover:shadow-xl hover:-translate-y-2 transition-all duration-300 bg-white">
                  
                  {/* Icon Circle */}
                  <div
                    className="
                      w-14 h-14 mx-auto mb-6
                      flex items-center justify-center
                      rounded-full
                      bg-muted text-foreground
                      shadow-sm border
                      transition-all duration-300
                      group-hover:bg-primary
                      group-hover:text-primary-foreground
                    "
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  <h3 className="text-xl font-semibold mb-4">
                    {item.title}
                  </h3>

                  <p className="text-gray-600">
                    {item.desc}
                  </p>

                </div>
              </FadeIn>
            )
          })}
        </div>

      </div>
    </section>
  )
}