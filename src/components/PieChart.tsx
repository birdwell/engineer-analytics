import React, { useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PieChartData {
  name: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  title: string;
}

export default function PieChart({ data, title }: PieChartProps) {
  const chartRef = useRef<ChartJS<'doughnut'>>(null);

  if (!data.length) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <div className="text-base font-medium">No review assignments found</div>
          </div>
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const chartData = {
    labels: data.map(item => item.name),
    datasets: [
      {
        data: data.map(item => item.value),
        backgroundColor: data.map(item => item.color),
        borderColor: data.map(item => item.color),
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverOffset: 8,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // We'll use custom legend
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${context.parsed} reviews (${percentage}%)`;
          },
        },
      },
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1000,
      easing: 'easeOutQuart',
    },
    interaction: {
      intersect: false,
      mode: 'point',
    },
    onHover: (event, elements) => {
      if (event.native?.target) {
        (event.native.target as HTMLElement).style.cursor = elements.length > 0 ? 'pointer' : 'default';
      }
    },
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const elementIndex = elements[0].index;
        const engineer = data[elementIndex];
        console.log(`Clicked on ${engineer.name} with ${engineer.value} reviews`);
      }
    },
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">{title}</h2>
      
      <div className="flex flex-col xl:flex-row items-center space-y-6 xl:space-y-0 xl:space-x-8">
        <div className="relative w-64 h-64 flex-shrink-0">
          <Doughnut ref={chartRef} data={chartData} options={options} />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{total}</div>
              <div className="text-sm font-medium text-gray-600">Total Reviews</div>
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {data.map((item, index) => {
              const percentage = ((item.value / total) * 100).toFixed(1);
              return (
                <div 
                  key={index} 
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => {
                    if (chartRef.current) {
                      chartRef.current.setActiveElements([{ datasetIndex: 0, index }]);
                      chartRef.current.update('none');
                    }
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors break-words">
                        {item.name}
                      </span>
                      <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                        <span className="text-sm font-semibold text-gray-900">
                          {item.value}
                        </span>
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                    <div className="mt-1">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all duration-300 group-hover:opacity-80"
                          style={{ 
                            backgroundColor: item.color, 
                            width: `${percentage}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}