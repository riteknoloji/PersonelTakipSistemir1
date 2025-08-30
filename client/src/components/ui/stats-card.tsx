import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  iconColor?: string;
  onClick?: () => void;
}

export function StatsCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  iconColor = "text-primary",
  onClick 
}: StatsCardProps) {
  return (
    <Card 
      className={`p-6 ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
      onClick={onClick}
      data-testid={`card-stats-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <CardContent className="p-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground" data-testid={`text-stats-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </p>
          </div>
          <div className={`w-12 h-12 ${iconColor.replace('text-', 'bg-')}/10 rounded-lg flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        </div>
        {description && (
          <div className="mt-2">
            <span className="text-sm text-accent">{description}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
