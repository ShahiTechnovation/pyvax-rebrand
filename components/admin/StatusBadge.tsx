'use client'

import React from 'react'

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'Pending', color: '#FFD700', bg: 'rgba(255,215,0,0.1)' },
    active: { label: 'Active', color: '#4CAF50', bg: 'rgba(76,175,80,0.1)' },
    review: { label: 'Under Review', color: '#6B8CAE', bg: 'rgba(107,140,174,0.1)' },
    completed: { label: 'Completed', color: '#4CAF50', bg: 'rgba(76,175,80,0.15)' },
    failed: { label: 'Needs Revision', color: '#E84142', bg: 'rgba(232,65,66,0.1)' },
    none: { label: 'No Mission', color: '#555', bg: 'rgba(85,85,85,0.1)' },
}

export function StatusBadge({ status }: { status: string }) {
    const s = STATUS_MAP[status] || STATUS_MAP.none
    return (
        <span
            className="inline-flex items-center gap-1.5 font-[family-name:var(--font-dm-mono)] text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border"
            style={{ color: s.color, backgroundColor: s.bg, borderColor: `${s.color}30` }}
        >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
        </span>
    )
}

export function RoleBadge({ role, roleLabel }: { role: string; roleLabel: string }) {
    const ROLE_COLORS: Record<string, string> = {
        product_marketing_agent: '#FF6B6B',
        growth_agent: '#4CAF50',
        reply_guy_agent: '#6B8CAE',
        bug_terminator_agent: '#E84142',
        swe_agent: '#9C27B0',
    }
    const color = ROLE_COLORS[role] || '#888'
    return (
        <span
            className="inline-flex items-center font-[family-name:var(--font-dm-mono)] text-[10px] tracking-wider px-2 py-0.5 rounded border"
            style={{ color, backgroundColor: `${color}10`, borderColor: `${color}25` }}
        >
            {roleLabel}
        </span>
    )
}
