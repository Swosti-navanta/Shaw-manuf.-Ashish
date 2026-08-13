"use client";

import { useState, type ReactNode } from "react";
import TopBar from "@/components/layout/TopBar";
import DetailDrawer from "@/components/detail/DetailDrawer";
import { PersonaProvider } from "@/context/PersonaContext";
import { ScopeProvider } from "@/context/ScopeContext";
import { ThresholdProvider } from "@/context/ThresholdContext";
import { RunProvider } from "@/context/RunContext";
import { ScheduleProvider } from "@/context/ScheduleContext";
import { QualityProvider } from "@/context/QualityContext";
import { YarnProvider } from "@/context/YarnContext";
import { DetailDrawerProvider } from "@/context/DetailDrawerContext";
import Sidebar from "@/components/layout/Sidebar";

export default function PortalLayout({ children }: { children: ReactNode }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  return (
    <PersonaProvider>
      <ScopeProvider>
        {/* Thresholds sits above Run because the dial is what decides whether
            today's deviation ever reaches a person. */}
        <ThresholdProvider>
          <RunProvider>
            {/* Schedule reads the accepted option — accepting in Make is what
                rebuilds this sequence, so it has to sit inside RunProvider. */}
            <ScheduleProvider>
            {/* Quality sits inside Schedule: sending a finding to Sawyer is
                what writes a rule into the constraint model. */}
            <QualityProvider>
            <YarnProvider>
              <DetailDrawerProvider>
              <div className="flex h-screen w-screen overflow-hidden">
                <Sidebar expanded={sidebarExpanded} onExpandedChange={setSidebarExpanded} />
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                  <TopBar onToggleSidebar={() => setSidebarExpanded((v) => !v)} />

                  <div
                    className="relative flex-1 min-h-0"
                    style={{ background: "var(--gradient-page-bg)" }}
                  >
                    {/* Decorative circle, fixed top-right */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/circle-background.svg"
                      alt=""
                      aria-hidden="true"
                      className="fixed pointer-events-none select-none"
                      style={{ width: "100%", height: "auto", top: 0, right: 0, zIndex: 0 }}
                    />

                    <div className="relative h-full flex">
                      <div className="flex-1 overflow-y-auto hide-scrollbar noise-overlay">
                        <div
                          className="relative z-[1] flex flex-col gap-6 py-6 min-h-full px-[16px] md:px-[24px]"
                          style={{ maxWidth: 1648, marginLeft: "auto", marginRight: "auto" }}
                        >
                          {children}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <DetailDrawer />
            </DetailDrawerProvider>
              </YarnProvider>
            </QualityProvider>
            </ScheduleProvider>
          </RunProvider>
        </ThresholdProvider>
      </ScopeProvider>
    </PersonaProvider>
  );
}
