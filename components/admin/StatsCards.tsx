'use client'

import React from 'react'
import { Bot, Zap, CheckCircle, AlertTriangle, Star } from 'lucide-react'

interface StatsCardsProps {
    total: number
    active: number
    completed: number
    avgXp: number
    loading?: boolean
}

function StatSkeleton() {
    return (
        <div className="bg-[#111] border border-[#1F1F1F] rounded-xl p-5 animate-pulse">
            <div className="h-3 w-16 bg-[#1A1A1A] rounded mb-4" />
            <div className="h-7 w-12 bg-[#1A1A1A] rounded" />
        </div>
    )
}

export function StatsCards({ total, active, completed, avgXp, loading }: StatsCardsProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[1, 2, 3, 4].map((i) => <StatSkeleton key={i} />)}
            </div>
        )
    }

    const cards = [
        { label: 'Total Agents', value: total, icon: <Bot className="w-4 h-4" />, color: '#E84142' },
        { label: 'Active', value: active, icon: <Zap className="w-4 h-4" />, color: '#4CAF50' },
        { label: 'Completed', value: completed, icon: <CheckCircle className="w-4 h-4" />, color: '#FFD700' },
        { label: 'Avg XP', value: avgXp, icon: <Star className="w-4 h-4" />, color: '#9C27B0' },
    ]

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map((card) => (
                <div
                    key={card.label}
                    className="bg-[#111] border border-[#1F1F1F] rounded-xl p-5 hover:border-[rgba(232,65,66,0.2)] transition-colors"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-[family-name:var(--font-dm-mono)] text-[9px] text-[#555] tracking-[0.15em] uppercase">
                            {card.label}
                        </span>
                        <div style={{ color: card.color }}>{card.icon}</div>
                    </div>
                    <div className="font-[family-name:var(--font-press-start)] text-[22px]" style={{ color: card.color }}>
                        {card.value}
                    </div>
                </div>
            ))}
        </div>
    )
}
