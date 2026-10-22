"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { ChevronRight, CircleCheck, FileSpreadsheet, History, PencilLine, Plus, ReceiptText, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

type ContractRecord = { status: string };

export default function ContractsModule({
  allActivities,
  allBudgetLines,
  contractCommitmentMnt,
  contractExporting,
  contractOwnerFilter,
  contractOwnerOptions,
  contractPaidMnt,
  contractQuery,
  contractSaving,
  contractSectionFilter,
  contractStartYearFilter,
  contractStartYears,
  contractState,
  contractStats,
  contractStatusFilter,
  contractStatusMeta,
  contractTargets,
  contracts,
  currentSession,
  exportContracts,
  filteredContracts,
  formatDate,
  formatMnt,
  formatUsd,
  language,
  localizedTargetLabel,
  openAddContract,
  openAuditHistory,
  openEditContract,
  paymentTransferDates,
  selectedYear,
  setContractDetailId,
  setContractOwnerFilter,
  setContractQuery,
  setContractSectionFilter,
  setContractStartYearFilter,
  setContractStatusFilter,
  setContractToClose,
  setContractToDelete,
  setPaymentPaid,
  setPaymentTransferDates,
}: any) {
  return (
    <>
<nav className="mx-auto flex w-full max-w-6xl items-center gap-2 text-sm font-semibold text-[#5d7467]" aria-label="Contracts breadcrumb">
              <button type="button" onClick={() => { setContractStatusFilter("all"); setContractStartYearFilter("all"); setContractOwnerFilter("all"); setContractSectionFilter("all"); }} className="hover:text-[#174734]">Contracts</button>
              {contractStatusFilter !== "all" && (
                <>
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-[#174734]">{contractStatusMeta[contractStatusFilter as ContractRecord["status"]]?.label}</span>
                </>
              )}
              {contractStartYearFilter !== "all" && (
                <>
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-[#174734]">Started {contractStartYearFilter}</span>
                </>
              )}
              {contractOwnerFilter !== "all" && (
                <>
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-[#174734]">
                    {contractOwnerFilter === "no_owner"
                      ? "No accountable owner"
                      : contractOwnerFilter}
                  </span>
                </>
              )}
              {contractSectionFilter !== "all" && (
                <>
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-[#174734]">Section {contractSectionFilter}</span>
                </>
              )}
            </nav>
            <section className="mx-auto w-full max-w-6xl rounded-2xl border border-[#d7ded5] bg-white p-4 shadow-[0_8px_26px_rgba(20,36,27,0.05)] lg:flex lg:items-end lg:justify-between">
              <div className="mb-4 lg:mb-0">
                <h2 className="text-xl font-black">Contract management</h2>
                <p className="mt-1 max-w-3xl text-sm text-[#718178]">
                  Link contracts and payment deliverables to the workplan. Unpaid contract value is commitment; paid installments become expenditure.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => void exportContracts()}
                  disabled={contractExporting || !filteredContracts.length}
                  className="border-[#b9cabb] bg-white"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {contractExporting ? "Preparing…" : "Export Excel"}
                </Button>
                <Button
                  onClick={openAddContract}
                  className="bg-[#0c3b2d] text-white hover:bg-[#174d3a]"
                  disabled={!contractTargets.length}
                >
                  <Plus className="h-4 w-4" />
                  Add contract
                </Button>
              </div>
            </section>

            <section className="mx-auto w-full max-w-6xl rounded-2xl border border-[#b9cabb] bg-[#e9f1e6] p-3">
              <div className="mb-3 flex items-center gap-2 px-1">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#0c3b2d] text-white">
                  <ReceiptText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-black">Contract financial position</h3>
                  <p className="text-xs text-[#5d7467]">Current {selectedYear} register</p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  ["Active contracts", String(contractStats.active)],
                  ["Total contract value", formatMnt(contractStats.totalValue)],
                  ["Outstanding commitment", formatMnt(contractStats.outstanding)],
                  ["Paid expenditure", formatMnt(contractStats.paid)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/80 bg-white p-3 shadow-sm">
                    <dt className="text-xs font-semibold text-[#718178]">{label}</dt>
                    <dd className="mt-1 whitespace-nowrap text-base font-black tabular-nums text-[#183529]">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-[#d7ded5] bg-white">
              <div className="flex flex-col gap-3 border-b border-[#e2e7e0] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="relative min-w-0 flex-1 sm:max-w-xl">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a8c81]" />
                  <Input
                    value={contractQuery}
                    onChange={(event) => setContractQuery(event.target.value)}
                    placeholder="Search contract, ToR, provider or workplan code"
                    className="h-10 border-[#ced8cf] bg-[#f8faf7] pl-9"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                  <NativeSelect
                    value={contractSectionFilter}
                    onChange={(event) => setContractSectionFilter(event.target.value)}
                    className="h-10 min-w-[150px] border-[#ced8cf] bg-[#f8faf7]"
                    aria-label="Filter contracts by workplan section"
                  >
                    <NativeSelectOption value="all">A and B</NativeSelectOption>
                    <NativeSelectOption value="A">Section A</NativeSelectOption>
                    <NativeSelectOption value="B">Section B</NativeSelectOption>
                  </NativeSelect>
                  <NativeSelect
                    value={contractStatusFilter}
                    onChange={(event) => setContractStatusFilter(event.target.value)}
                    className="h-10 min-w-[165px] border-[#ced8cf] bg-[#f8faf7]"
                    aria-label="Filter contracts by status"
                  >
                    <NativeSelectOption value="all">All statuses</NativeSelectOption>
                    {Object.entries(contractStatusMeta).map(([value, meta]) => (
                      <NativeSelectOption key={value} value={value}>
                        {meta.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <NativeSelect
                    value={contractStartYearFilter}
                    onChange={(event) => setContractStartYearFilter(event.target.value)}
                    className="h-10 min-w-[165px] border-[#ced8cf] bg-[#f8faf7]"
                    aria-label="Filter contracts by starting year"
                  >
                    <NativeSelectOption value="all">All start years</NativeSelectOption>
                    {contractStartYears.map((year) => (
                      <NativeSelectOption key={year} value={year}>Started {year}</NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <NativeSelect
                    value={contractOwnerFilter}
                    onChange={(event) => setContractOwnerFilter(event.target.value)}
                    className="h-10 min-w-[190px] border-[#ced8cf] bg-[#f8faf7]"
                    aria-label="Filter contracts by accountable owner"
                  >
                    <NativeSelectOption value="all">All accountable owners</NativeSelectOption>
                    {contractOwnerOptions.names.map((name) => (
                      <NativeSelectOption key={name} value={name}>{name}</NativeSelectOption>
                    ))}
                    {contractOwnerOptions.hasUnassigned && (
                      <NativeSelectOption value="no_owner">No accountable owner</NativeSelectOption>
                    )}
                  </NativeSelect>
                </div>
              </div>

              {contractState === "unavailable" && (
                <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
                  Saved contracts are temporarily unavailable.
                </div>
              )}

              <div className="space-y-3 bg-[#f7f9f5] p-3 sm:p-4">
                {filteredContracts.map((contract) => {
                  const fundingDetails = (contract.allocations ?? []).map((allocation) => ({
                    allocation,
                    target: contractTargets.find(
                      (item) => item.key === allocation.activityKey,
                    ),
                    line: allBudgetLines.find(
                      (item) => item.id === allocation.budgetKey,
                    ),
                  }));
                  const paidMnt = contractPaidMnt(contract);
                  const commitmentMnt = contractCommitmentMnt(contract);
                  const expanded = false;
                  const statusInfo = contractStatusMeta[contract.status];
                  return (
                    <article
                      key={contract.id}
                      className="overflow-hidden rounded-2xl border border-[#d5dfd3] bg-white shadow-[0_5px_16px_rgba(20,36,27,0.04)]"
                    >
                      <div className="p-3 sm:p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-[#e9f0e6] px-2 py-1 font-mono text-xs font-black text-[#2f634c]">
                                {contract.contractNumber}
                              </span>
                              {contract.transferredFromYear > 0 && (
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
                                  Transferred from {contract.transferredFromYear}
                                </span>
                              )}
                              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusInfo.tone}`}>
                                {statusInfo.label}
                              </span>
                            </div>
                            <h3 className="mt-2 break-words text-base font-black leading-5 text-[#183529]">
                              {contract.torName}
                            </h3>
                            <p className="mt-1 text-xs font-semibold text-[#53685c]">
                              {contract.serviceProviderName} · {contract.serviceProviderType}
                            </p>
                            <p className="mt-2 break-words text-xs leading-5 text-[#718178]">
                              {fundingDetails.length} budget line{fundingDetails.length === 1 ? "" : "s"} · {fundingDetails.map(({ line, target }) => `${line?.code ?? "Budget"} / ${target?.code ?? "Workplan"}`).join(" · ")}
                            </p>
                            <p className="mt-1 text-xs text-[#718178]">
                              {formatDate(contract.startDate, language)} – {formatDate(contract.endDate, language)}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                void openAuditHistory({ entityType: "contract", entityKey: contract.id, label: contract.contractNumber });
                              }}
                            >
                              <History className="h-4 w-4" />
                              Amendments
                            </Button>
                            <Button variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); openEditContract(contract); }}>
                              <PencilLine className="h-4 w-4" />
                              Edit
                            </Button>
                            {currentSession?.isAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(event) => { event.stopPropagation(); setContractToDelete(contract); }}
                                className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Button>
                            )}
                            {contract.status !== "closed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(event) => { event.stopPropagation(); setContractToClose(contract); }}
                                className="border-amber-300 text-amber-900 hover:bg-amber-50"
                              >
                                Close contract
                              </Button>
                            )}
                          </div>
                        </div>

                        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {[
                            [
                              "Contract amount",
                              contract.currency === "USD"
                                ? `${formatUsd(contract.foreignAmountMinor)} · ${formatMnt(contract.amountMnt)}`
                                : formatMnt(contract.amountMnt),
                            ],
                            ["Outstanding commitment", formatMnt(commitmentMnt)],
                            ["Paid expenditure", formatMnt(paidMnt)],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-lg bg-[#f3f7f1] px-3 py-2">
                              <dt className="text-xs font-semibold text-[#718178]">{label}</dt>
                              <dd className="mt-1 whitespace-nowrap text-sm font-black tabular-nums">
                                {value}
                              </dd>
                            </div>
                          ))}
                        </dl>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            setContractDetailId(contract.id);
                          }}
                          className="mt-3 h-8 px-2.5 text-xs"
                        >
                          Open contract <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>

                      {expanded && (
                        <div className="border-t border-[#dfe7dc] bg-[#fbfcfa] p-3 sm:p-4">
                          <section className="mb-4 rounded-xl border border-[#cbd8c9] bg-[#eef4eb] p-3">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-black">Budget line allocation</p>
                                <p className="text-xs text-[#718178]">Contract value distributed across connected budget lines.</p>
                              </div>
                              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#315845]">
                                {fundingDetails.length} line{fundingDetails.length === 1 ? "" : "s"}
                              </span>
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                              {fundingDetails.map(({ allocation, line, target }) => {
                                const paid = contract.payments
                                  .filter((payment) => Boolean(payment.paid))
                                  .flatMap((payment) => payment.allocations ?? [])
                                  .filter(
                                    (item) =>
                                      item.budgetKey === allocation.budgetKey &&
                                      item.activityKey === allocation.activityKey,
                                  )
                                  .reduce((total, item) => total + item.amountMnt, 0);
                                return (
                                  <div key={allocation.id} className="rounded-lg border border-white bg-white p-3">
                                    <p className="font-mono text-xs font-black text-[#2f634c]">
                                      {line?.code ?? "Budget"} · {target?.code ?? "Workplan"}
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-xs font-semibold text-[#53685c]">
                                      {target ? localizedTargetLabel(target, allActivities, language) : "Removed workplan item"}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                      <span><b>Allocated:</b> {formatMnt(allocation.amountMnt)}</span>
                                      <span><b>Paid:</b> {formatMnt(paid)}</span>
                                      <span><b>Committed:</b> {formatMnt(contract.status === "closed" ? 0 : Math.max(allocation.amountMnt - paid, 0))}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </section>
                          <div className="space-y-3">
                            {contract.payments.map((payment) => (
                              <div
                                key={payment.id}
                                className="grid gap-3 rounded-xl border border-[#dfe7dc] bg-white p-4 lg:grid-cols-[minmax(100px,0.7fr)_minmax(120px,0.8fr)_minmax(190px,1.8fr)_70px_140px_150px_105px] lg:items-center"
                              >
                                <div>
                                  <p className="text-xs font-semibold text-[#718178]">Payment</p>
                                  <p className="mt-1 font-bold">{payment.label}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-[#718178]">Due date</p>
                                  <p className="mt-1 text-sm font-semibold">{formatDate(payment.dueDate, language)}</p>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-[#718178]">Deliverable</p>
                                  <p className="mt-1 break-words text-sm font-semibold">{payment.deliverable}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-[#718178]">Share</p>
                                  <p className="mt-1 font-black tabular-nums">{payment.percentage}%</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-[#718178]">Amount</p>
                                  <p className="mt-1 whitespace-nowrap font-black tabular-nums">
                                    {contract.currency === "USD" && payment.foreignAmountMinor
                                      ? `${formatUsd(payment.foreignAmountMinor)} · `
                                      : ""}
                                    {formatMnt(payment.amountMnt)}
                                  </p>
                                </div>
                                <label className="block">
                                  <span className="text-xs font-semibold text-[#718178]">
                                    Transfer date
                                  </span>
                                  <Input
                                    type="date"
                                    value={paymentTransferDates[payment.id] ?? payment.paidAt ?? ""}
                                    onChange={(event) =>
                                      setPaymentTransferDates((current) => ({
                                        ...current,
                                        [payment.id]: event.target.value,
                                      }))
                                    }
                                    disabled={Boolean(payment.paid) || contract.status === "closed"}
                                    className="mt-1 h-8 border-[#cbd6cc] bg-white px-2 text-xs"
                                  />
                                </label>
                                <Button
                                  size="sm"
                                  variant={payment.paid ? "outline" : "default"}
                                  disabled={contractSaving || contract.status === "closed"}
                                  onClick={() => setPaymentPaid(contract, payment, !payment.paid)}
                                  className={`h-8 px-2.5 text-xs ${payment.paid ? "border-emerald-300 text-emerald-800" : "bg-[#0c3b2d] text-white hover:bg-[#174d3a]"}`}
                                >
                                  {payment.paid ? (
                                    <>
                                      <CircleCheck className="h-4 w-4" /> Paid
                                    </>
                                  ) : (
                                    "Mark paid"
                                  )}
                                </Button>
                                {payment.paid && payment.paidAt && (
                                  <p className="text-xs text-emerald-800 lg:col-start-6">
                                    Paid {formatDate(payment.paidAt, language)}
                                  </p>
                                )}
                                <div className="rounded-lg bg-[#f3f7f1] px-3 py-2 text-xs lg:col-span-7">
                                  <span className="font-bold text-[#53685c]">Budget line split: </span>
                                  {(payment.allocations ?? []).map((allocation) => {
                                    const target = contractTargets.find(
                                      (item) => item.key === allocation.activityKey,
                                    );
                                    return `${target?.code ?? "Workplan"} ${formatMnt(allocation.amountMnt)}`;
                                  }).join(" · ") || "Not assigned"}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}

                {contractState === "ready" && filteredContracts.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[#bfcbbf] bg-white px-6 py-14 text-center">
                    <ReceiptText className="mx-auto h-7 w-7 text-[#779083]" />
                    <p className="mt-3 font-black">
                      {contracts.length ? "No contracts match these filters" : "No contracts yet"}
                    </p>
                    <p className="mt-1 text-sm text-[#718178]">
                      {contracts.length
                        ? "Try another status or search term."
                        : "Add the first contract and split its value into payment deliverables."}
                    </p>
                    {!contracts.length && (
                      <Button className="mt-4 bg-[#0c3b2d] text-white" onClick={openAddContract}>
                        <Plus className="h-4 w-4" /> Add contract
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </section>
    </>
  );
}
