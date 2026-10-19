"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

type ModuleErrorBoundaryProps = {
  children: ReactNode;
  moduleName: string;
};

type ModuleErrorBoundaryState = {
  error: Error | null;
};

export class ModuleErrorBoundary extends Component<
  ModuleErrorBoundaryProps,
  ModuleErrorBoundaryState
> {
  state: ModuleErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ModuleErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`${this.props.moduleName} module failed to render`, error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <section className="rounded-2xl border border-[#ead6d3] bg-[#fff8f6] p-6 shadow-sm">
        <p className="text-sm font-black text-[#9b2c2c]">
          {this.props.moduleName} could not be displayed.
        </p>
        <p className="mt-1 text-sm text-[#765f5a]">
          Other parts of the ERP are still available. Try loading this module again.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => this.setState({ error: null })}
        >
          Reload module
        </Button>
      </section>
    );
  }
}

export function ModuleLoading({ label }: { label: string }) {
  return (
    <section className="rounded-2xl border border-[#d7ded5] bg-white p-6 shadow-sm">
      <div className="h-4 w-40 animate-pulse rounded-full bg-[#e4ebe1]" />
      <div className="mt-4 h-28 animate-pulse rounded-xl bg-[#f1f5ef]" />
      <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-[#718178]">
        Loading {label}
      </p>
    </section>
  );
}
