"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronRight, CopyPlus, History, Mail, PencilLine, Plus, Settings2, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { metadataCategories, metadataCategoryLabels } from "@/lib/system-metadata";

export default function AdminModule({
  accessMembers,
  addMetadataOption,
  adminControlSection,
  backupListExpanded,
  backupSaving,
  backups,
  createBackup,
  currentSession,
  formatUpdatedAt,
  language,
  metadataDrafts,
  metadataLabel,
  metadataSavingCategory,
  metadataState,
  moveMetadataOption,
  openAddActivity,
  openAddTeamMember,
  openAuditHistory,
  openEditTeamMember,
  openYearDialog,
  prepareTeamInvite,
  previewBackup,
  removeMetadataOption,
  saveMetadataCategory,
  selectedMetadataCategory,
  selectedYear,
  setAdminControlSection,
  setBackupListExpanded,
  setSelectedMetadataCategory,
  setYearDeleteOpen,
  teamMembers,
  teamState,
  updateMetadataOption,
}: any) {
  return (
    <>
<section className="rounded-2xl border border-[#d7ded5] bg-white p-4 shadow-[0_8px_26px_rgba(20,36,27,0.05)] lg:flex lg:items-end lg:justify-between lg:p-5">
              <div className="mb-4 lg:mb-0">
                <h2 className="text-xl font-black">Admin control</h2>
                <p className="mt-1 text-sm text-[#718178]">
                  Manage users, workplan years, and the shared dropdown options used across the ERP system.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {currentSession && (
                  <div className="flex h-10 items-center gap-2 rounded-xl border border-[#ced8cf] bg-[#f8faf7] px-3 text-sm font-semibold text-[#315845]">
                    {currentSession.isAdmin && <ShieldCheck className="h-4 w-4" />}
                    {currentSession.memberName} · {currentSession.isAdmin ? "Admin" : "Member"}
                  </div>
                )}
                <a
                  href="/signout-with-chatgpt?return_to=%2F"
                  target="_top"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[#ced8cf] bg-white px-3 text-sm font-bold text-[#315845] hover:bg-[#f5f8f4]"
                >
                  Sign out
                </a>
                {currentSession?.isAdmin && adminControlSection === "users" && (
                  <Button
                    onClick={openAddTeamMember}
                    className="h-10 bg-[#0c3b2d] text-white hover:bg-[#174d3a]"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add member
                  </Button>
                )}
              </div>
            </section>

            {currentSession?.isAdmin && (
              <div className="inline-flex rounded-xl border border-[#cfdacf] bg-white p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setAdminControlSection("users")}
                  className={`flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${
                    adminControlSection === "users"
                      ? "bg-[#0c3b2d] text-white"
                      : "text-[#53685c] hover:bg-[#f0f5ee]"
                  }`}
                >
                  <Users className="h-4 w-4" /> User directory
                </button>
                <button
                  type="button"
                  onClick={() => setAdminControlSection("metadata")}
                  className={`flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-black transition ${
                    adminControlSection === "metadata"
                      ? "bg-[#0c3b2d] text-white"
                      : "text-[#53685c] hover:bg-[#f0f5ee]"
                  }`}
                >
                  <Settings2 className="h-4 w-4" /> Meta data control
                </button>
              </div>
            )}

            {adminControlSection === "users" && teamState === "unavailable" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                User registration information is temporarily unavailable.
              </div>
            )}

            {currentSession?.isAdmin && adminControlSection === "metadata" && (
              <div className="space-y-5">
                <section className="rounded-2xl border border-[#cfdacf] bg-white p-5 shadow-[0_10px_28px_rgba(20,36,27,0.05)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-[#5f7568]">Workplan administration</p>
                      <h3 className="mt-1 text-lg font-black">Year and planning controls</h3>
                      <p className="mt-1 text-sm text-[#718178]">
                        Use the year selector in the header to view any saved plan. Creating and deleting years remains restricted to administrators.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cbd6cc] bg-[#f7faf5] px-3 text-sm font-black text-[#315845]">
                        <CalendarDays className="h-4 w-4" /> {language === "mn" ? `${selectedYear} оны төлөвлөгөө` : `${selectedYear} workplan`}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="h-10 bg-[#0c3b2d] text-white hover:bg-[#174d3a]">
                            <Settings2 className="h-4 w-4" /> Planning
                            <ChevronRight className="h-4 w-4 rotate-90" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-60">
                          <DropdownMenuItem onClick={openYearDialog}>
                            <CopyPlus className="h-4 w-4" /> Create next year draft
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={openAddActivity}>
                            <Plus className="h-4 w-4" /> Add activity to {selectedYear}
                          </DropdownMenuItem>
                          {selectedYear > 2026 && (
                            <DropdownMenuItem
                              onClick={() => setYearDeleteOpen(true)}
                              className="text-rose-700 focus:text-rose-700"
                            >
                              <Trash2 className="h-4 w-4" /> Delete entire {selectedYear} year
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-[#cfdacf] bg-white shadow-[0_10px_28px_rgba(20,36,27,0.05)]">
                  <div className="border-b border-[#e2e7e0] p-5">
                    <h3 className="text-lg font-black">System dropdown options</h3>
                    <p className="mt-1 text-sm text-[#718178]">
                      Rename, reorder, add, or remove options. Saved changes apply throughout Workplan, Finance, Dashboard, MEL, and Contracts.
                    </p>
                  </div>
                  <div className="grid min-h-[420px] md:grid-cols-[230px_minmax(0,1fr)]">
                    <nav className="border-b border-[#e2e7e0] bg-[#f5f8f3] p-3 md:border-b-0 md:border-r" aria-label="Metadata categories">
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
                        {metadataCategories.map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => setSelectedMetadataCategory(category)}
                            className={`rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                              selectedMetadataCategory === category
                                ? "bg-[#0c3b2d] text-white shadow-sm"
                                : "text-[#456052] hover:bg-white"
                            }`}
                          >
                            {metadataCategoryLabels[category]}
                          </button>
                        ))}
                      </div>
                    </nav>
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-black">{metadataCategoryLabels[selectedMetadataCategory]}</h4>
                          <p className="mt-1 text-xs leading-5 text-[#718178]">
                            The internal key remains stable so existing records keep working when you rename an option.
                          </p>
                        </div>
                        <span className="rounded-full bg-[#e8f0e4] px-2.5 py-1 text-xs font-bold text-[#315845]">
                          {metadataDrafts[selectedMetadataCategory].length} options
                        </span>
                      </div>
                      <div className="mt-4 space-y-2">
                        {metadataDrafts[selectedMetadataCategory].map((item, index) => (
                          <div key={item.value} className="grid gap-2 rounded-xl border border-[#dce4da] bg-[#fafcf9] p-3 sm:grid-cols-[minmax(0,1fr)_170px_auto] sm:items-center">
                            <Input
                              value={item.label}
                              onChange={(event) =>
                                updateMetadataOption(
                                  selectedMetadataCategory,
                                  item.value,
                                  event.target.value,
                                )
                              }
                              className="h-9 border-[#cbd6cc] bg-white font-semibold"
                              aria-label={`Visible name for ${item.value}`}
                            />
                            <code className="truncate rounded-lg bg-[#edf2eb] px-2.5 py-2 text-xs text-[#53685c]">{item.value}</code>
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={index === 0}
                                onClick={() => moveMetadataOption(selectedMetadataCategory, item.value, -1)}
                                aria-label="Move option up"
                              >
                                <ChevronRight className="h-4 w-4 -rotate-90" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                disabled={index === metadataDrafts[selectedMetadataCategory].length - 1}
                                onClick={() => moveMetadataOption(selectedMetadataCategory, item.value, 1)}
                                aria-label="Move option down"
                              >
                                <ChevronRight className="h-4 w-4 rotate-90" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-rose-700"
                                disabled={metadataDrafts[selectedMetadataCategory].length <= 1}
                                onClick={() => removeMetadataOption(selectedMetadataCategory, item.value)}
                                aria-label="Remove option"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-[#e2e7e0] pt-4">
                        <Button type="button" variant="outline" onClick={() => addMetadataOption(selectedMetadataCategory)}>
                          <Plus className="h-4 w-4" /> Add option
                        </Button>
                        <Button
                          type="button"
                          onClick={() => void saveMetadataCategory(selectedMetadataCategory)}
                          disabled={metadataSavingCategory === selectedMetadataCategory || metadataState === "loading"}
                          className="bg-[#0c3b2d] text-white hover:bg-[#174d3a]"
                        >
                          {metadataSavingCategory === selectedMetadataCategory ? "Saving…" : "Save category"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            <section className={`${adminControlSection === "users" ? "" : "hidden"} overflow-hidden rounded-2xl border border-[#d7ded5] bg-white shadow-[0_12px_32px_rgba(20,36,27,0.05)]`}>
              <div className="flex flex-col gap-2 border-b border-[#e2e7e0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black">
                    {currentSession?.isAdmin ? "User directory" : "Your account"}
                  </h2>
                  <p className="mt-1 text-sm text-[#718178]">
                    {currentSession?.isAdmin
                      ? "Administrators can register users, update profiles, prepare invitations, and grant administrator access."
                      : "Your sign-in and registration information is managed by a workplan administrator."}
                  </p>
                </div>
                {currentSession?.isAdmin && (
                  <span className="text-sm font-semibold text-[#5d7467]">
                    {teamMembers.length} registered team records
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <Table className="min-w-[1080px]">
                  <TableHeader>
                    <TableRow className="bg-[#f7f9f5] hover:bg-[#f7f9f5]">
                      <TableHead className="w-[280px] pl-5">Team member</TableHead>
                      <TableHead className="w-[260px]">Sign-in email</TableHead>
                      <TableHead className="w-[140px]">Access level</TableHead>
                      <TableHead className="w-[230px]">Registration</TableHead>
                      <TableHead className="w-[240px] pr-5 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accessMembers.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="pl-5">
                          <div className="flex items-start gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e7efe3] text-sm font-black text-[#275b45]">
                              {item.name
                                .split(/[.\s]/)
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((part) => part[0])
                                .join("")}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-black">{item.name}</p>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${item.group === "PCU" ? "bg-[#dcefd6] text-[#285a43]" : item.group === "MNLF" ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-600"}`}
                                >
                                  {metadataLabel("member_type", item.group)}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-[#718178]">{item.role}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.email ? (
                            <p className="break-all font-semibold text-[#315845]">{item.email}</p>
                          ) : (
                            <span className="text-sm font-semibold text-amber-700">Email required</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${item.accessRole === "admin" ? "bg-[#dcefd6] text-[#285a43]" : "bg-slate-100 text-slate-700"}`}
                          >
                            {item.accessRole === "admin" && <ShieldCheck className="h-3.5 w-3.5" />}
                            {item.accessRole === "admin" ? "Administrator" : "Member"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <span
                              className={`h-2 w-2 rounded-full ${item.inviteStatus === "active" ? "bg-emerald-600" : item.inviteStatus === "invited" ? "bg-blue-600" : item.email ? "bg-amber-500" : "bg-rose-500"}`}
                            />
                            {item.inviteStatus === "active"
                              ? "Signed in"
                              : item.inviteStatus === "invited"
                                ? "Invitation prepared"
                                : item.email
                                  ? "Ready to invite"
                                  : "Registration incomplete"}
                          </div>
                          {item.lastSignedInAt && (
                            <p className="mt-1 text-xs text-[#718178]">
                              Last sign-in {formatUpdatedAt(item.lastSignedInAt, language)}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="pr-5">
                          <div className="flex justify-end gap-2">
                            {currentSession?.isAdmin ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => void openAuditHistory({ entityType: "team", entityKey: item.id, label: item.name })}
                                  aria-label="View team member history"
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                                {item.email && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void prepareTeamInvite(item)}
                                  >
                                    <Mail className="h-4 w-4" />
                                    {item.inviteStatus === "active" ? "Send again" : "Invite"}
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditTeamMember(item)}
                                >
                                  <PencilLine className="h-4 w-4" />
                                  Edit
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-[#718178]">Managed by administrator</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!accessMembers.length && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-sm text-[#718178]">
                          Loading account information…
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="border-t border-[#e2e7e0] bg-[#f8faf7] px-5 py-3 text-xs leading-5 text-[#718178]">
                A user must sign in with the exact email saved here. Invitations open as a prepared email for the administrator to review and send.
              </div>
            </section>
            {currentSession?.isAdmin && adminControlSection === "users" && (
              <section className="overflow-hidden rounded-2xl border border-[#d7ded5] bg-white">
                <div className="flex flex-col gap-3 border-b border-[#e2e7e0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-black">Backups and restore</h2>
                    <p className="mt-1 text-sm text-[#718178]">
                      Database snapshots are retained for 30 days. Preview is required before restore.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#eef4eb] px-3 py-1.5 text-xs font-bold text-[#496356]">
                      {backups.length} snapshots
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setBackupListExpanded((current) => !current)}
                      aria-expanded={backupListExpanded}
                    >
                      <ChevronRight className={`h-4 w-4 transition-transform ${backupListExpanded ? "rotate-90" : ""}`} />
                      {backupListExpanded ? "Hide backups" : "View backups"}
                    </Button>
                    <Button onClick={() => void createBackup()} disabled={backupSaving} className="bg-[#0c3b2d] text-white hover:bg-[#174d3a]">
                      <ShieldCheck className="h-4 w-4" /> {backupSaving ? "Working…" : "Create backup now"}
                    </Button>
                  </div>
                </div>
                {!backupListExpanded && (
                  <button
                    type="button"
                    onClick={() => setBackupListExpanded(true)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm text-[#5f7568] transition hover:bg-[#f8faf7]"
                  >
                    <span>Expand to review the complete backup and restore history.</span>
                    <span className="shrink-0 font-bold text-[#245f47]">View full list</span>
                  </button>
                )}
                {backupListExpanded && (
                  <div className="max-h-[440px] overflow-y-auto divide-y divide-[#e8ece6]">
                    {backups.map((backup) => (
                      <div key={backup.id} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-bold">{formatUpdatedAt(backup.createdAt, language)}</p>
                          <p className="mt-1 text-xs text-[#718178]">{backup.recordCount} records · {backup.source} · {backup.createdBy}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => void previewBackup(backup)} disabled={backupSaving}>
                          Preview restore
                        </Button>
                      </div>
                    ))}
                    {!backups.length && (
                      <p className="px-5 py-8 text-center text-sm text-[#718178]">No backup snapshots yet.</p>
                    )}
                  </div>
                )}
              </section>
            )}
    </>
  );
}
