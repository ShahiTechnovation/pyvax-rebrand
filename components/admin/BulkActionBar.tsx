'use client'

import React from 'react'
import { CheckCircle, XCircle, Zap, Download, Loader2 } from 'lucide-react'

interface BulkActionBarProps {
    selectedCount: number
    onApprove: () => void
    onReject: () => void
    onAssignMission: () => void
    onExportCsv: () => void
    onClearSelection: () => void
    loading?: boolean
}

export function BulkActionBar({
    selectedCount,
    onApprove,
    onReject,
    onAssignMission,
    onExportCsv,
    onClearSelection,
    loading,
}: BulkActionBarProps) {
    if (selectedCount === 0) return null

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-3 bg-[#111] border border-[#1F1F1F] rounded-2xl px-6 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-sm">
                <span className="font-[family-name:var(--font-dm-mono)] text-[12px] text-[#888] mr-2">
                    {selectedCount} selected
                </span>

                <div className="w-px h-6 bg-[#1F1F1F]" />

                <button
                    onClick={onApprove}
                    disabled={loading}
                    className="flex items-center gap-1.5 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#4CAF50] hover:bg-[#4CAF50]/10 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                    Approve
                </button>

                <button
                    onClick={onReject}
                    disabled={loading}
                    className="flex items-center gap-1.5 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#E84142] hover:bg-[#E84142]/10 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                    <XCircle className="w-3 h-3" />
                    Reject
                </button>

                <button
                    onClick={onAssignMission}
                    disabled={loading}
                    className="flex items-center gap-1.5 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#FFD700] hover:bg-[#FFD700]/10 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                    <Zap className="w-3 h-3" />
                    Assign Mission
                </button>

                <div className="w-px h-6 bg-[#1F1F1F]" />

                <button
                    onClick={onExportCsv}
                    className="flex items-center gap-1.5 font-[family-name:var(--font-dm-mono)] text-[11px] text-[#888] hover:bg-[#1A1A1A] px-3 py-1.5 rounded-lg transition"
                >
                    <Download className="w-3 h-3" />
                    CSV
                </button>

                <button
                    onClick={onClearSelection}
                    className="font-[family-name:var(--font-dm-mono)] text-[10px] text-[#555] hover:text-[#E84142] px-2 py-1 rounded transition"
                >
                    Clear
                </button>
            </div>
        </div>
    )
}
