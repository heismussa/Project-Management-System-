import React from 'react'
import { Card, Tag, Typography } from 'antd'

const { Title, Text } = Typography

export default function ReviewsPage() {
  const placeholderReviews = [
    { id: 1, project: 'System Migration', reviewer: 'John Doe', status: 'Pending', date: '2026-08-25' },
    { id: 2, project: 'API Gateway Setup', reviewer: 'Jane Smith', status: 'Approved', date: '2026-08-20' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <Title level={3} style={{ color: '#7A0C22', margin: 0 }}>
          Project Reviews
        </Title>
        <Text type="secondary">Review submitted deliverables and track approval statuses.</Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {placeholderReviews.map((review) => (
          <Card key={review.id} className="shadow-sm border rounded-xl">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-gray-800 text-base">{review.project}</h4>
              <Tag color={review.status === 'Approved' ? 'green' : 'gold'}>{review.status}</Tag>
            </div>
            <p className="text-sm text-gray-600">Assigned Reviewer: {review.reviewer}</p>
            <p className="text-xs text-gray-400 mt-2">Target Date: {review.date}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}