'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface TradingHistoryData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MSEStockChartProps {
  symbol: string;
  historyData: TradingHistoryData[];
}

interface Point {
  x: number;
  y: number;
  date: Date;
  value: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type ChartType = 'line' | 'candlestick';
type Period = '1M' | '3M' | '1Y' | 'ALL';

const candleColors = { up: '#22c55e', down: '#ef4444' };

export function MSEStockChart({ symbol, historyData }: MSEStockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const crosshairRef = useRef<SVGLineElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const pointsRef = useRef<Point[]>([]);
  const [activePeriod, setActivePeriod] = useState<Period>('3M');
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [isFallbackData, setIsFallbackData] = useState(false);

  // Update container size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          setContainerSize({ width: rect.width, height: rect.height });
        }
      }
    };
    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [historyData]);

  const drawCandlestickChart = useCallback((svg: SVGSVGElement, points: Point[], options: any) => {
    const { width, height, padding, minPrice, maxPrice } = options;
    const chartHeight = height - padding.top - padding.bottom;
    const bandwidth = (width - padding.left - padding.right) / points.length;
    const candleWidth = Math.max(3, bandwidth * 0.7);

    points.forEach(p => {
      const x = p.x;
      const openY = padding.top + chartHeight - ((p.open - minPrice) / (maxPrice - minPrice)) * chartHeight;
      const highY = padding.top + chartHeight - ((p.high - minPrice) / (maxPrice - minPrice)) * chartHeight;
      const lowY = padding.top + chartHeight - ((p.low - minPrice) / (maxPrice - minPrice)) * chartHeight;
      const closeY = padding.top + chartHeight - ((p.close - minPrice) / (maxPrice - minPrice)) * chartHeight;

      const isBullish = p.close >= p.open;
      const color = isBullish ? candleColors.up : candleColors.down;

      // Wick
      const wick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      wick.setAttribute('x1', x.toString());
      wick.setAttribute('y1', highY.toString());
      wick.setAttribute('x2', x.toString());
      wick.setAttribute('y2', lowY.toString());
      wick.setAttribute('stroke', color);
      wick.setAttribute('stroke-width', '1');
      svg.appendChild(wick);

      // Candle body
      const body = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      body.setAttribute('x', (x - candleWidth / 2).toString());
      body.setAttribute('y', Math.min(openY, closeY).toString());
      body.setAttribute('width', candleWidth.toString());
      body.setAttribute('height', Math.max(Math.abs(openY - closeY), 1).toString());
      body.setAttribute('fill', color);
      svg.appendChild(body);
    });
  }, []);

  // Draw chart using SVG
  useEffect(() => {
    if (!svgRef.current || historyData.length === 0 || containerSize.width === 0) return;

    const now = new Date();
    const periodMap: { [key: string]: number } = { '1M': 30, '3M': 90, '1Y': 365, 'ALL': Infinity };

    // Sort data by date (oldest first)
    const sortedData = [...historyData].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let filteredData = sortedData;
    if (activePeriod !== 'ALL') {
      const days = periodMap[activePeriod];
      const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      filteredData = sortedData.filter(item => new Date(item.date) >= cutoffDate);
    }

    setIsFallbackData(filteredData.length === 0);
    if (filteredData.length === 0) {
      filteredData = sortedData.slice(-30);
    }

    const svg = svgRef.current;
    const { width, height } = containerSize;
    const padding = { top: 20, right: 60, bottom: 40, left: 20 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    svg.innerHTML = '';
    const selectedColor = '#a855f7'; // purple-500 for line chart

    const allPrices = filteredData.flatMap(d => [d.high, d.low, d.open, d.close]);
    const minPrice = Math.min(...allPrices) * 0.998;
    const maxPrice = Math.max(...allPrices) * 1.002;

    pointsRef.current = filteredData.map((d, i) => {
      const x = padding.left + ((i + 0.5) / filteredData.length) * chartWidth;
      const y = padding.top + chartHeight - ((d.close - minPrice) / (maxPrice - minPrice)) * chartHeight;
      const change = i > 0 ? d.close - filteredData[i - 1].close : 0;
      const changePercent = i > 0 && filteredData[i - 1].close !== 0 
        ? (change / filteredData[i - 1].close) * 100 
        : 0;
      return {
        x, y,
        date: new Date(d.date),
        value: d.close,
        change,
        changePercent,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume
      };
    });

    // Gradient for line chart
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'chartGradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '0%');
    gradient.setAttribute('y2', '100%');
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', selectedColor);
    stop1.setAttribute('stop-opacity', '0.3');
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', selectedColor);
    stop2.setAttribute('stop-opacity', '0');
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    svg.appendChild(defs);

    const points = pointsRef.current;

    // Grid lines
    const yLabelCount = 5;
    const priceStep = (maxPrice - minPrice) / (yLabelCount - 1);
    for (let i = 0; i < yLabelCount; i++) {
      const price = minPrice + (i * priceStep);
      const y = padding.top + chartHeight - ((price - minPrice) / (maxPrice - minPrice)) * chartHeight;

      const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      gridLine.setAttribute('x1', padding.left.toString());
      gridLine.setAttribute('y1', y.toString());
      gridLine.setAttribute('x2', (width - padding.right).toString());
      gridLine.setAttribute('y2', y.toString());
      gridLine.setAttribute('stroke', '#374151');
      gridLine.setAttribute('stroke-dasharray', '2 2');
      svg.appendChild(gridLine);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', (width - padding.right + 8).toString());
      text.setAttribute('y', (y + 4).toString());
      text.setAttribute('text-anchor', 'start');
      text.setAttribute('font-size', '11px');
      text.setAttribute('fill', '#9ca3af');
      text.textContent = `₮${price.toLocaleString('mn-MN', { maximumFractionDigits: 0 })}`;
      svg.appendChild(text);
    }

    if (chartType === 'line' && points.length > 1) {
      const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      let pathData = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) pathData += ` L ${points[i].x} ${points[i].y}`;
      pathData += ` L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;
      areaPath.setAttribute('d', pathData);
      areaPath.setAttribute('fill', 'url(#chartGradient)');
      svg.appendChild(areaPath);

      const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathData = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) pathData += ` L ${points[i].x} ${points[i].y}`;
      linePath.setAttribute('d', pathData);
      linePath.setAttribute('stroke', selectedColor);
      linePath.setAttribute('stroke-width', '2');
      linePath.setAttribute('fill', 'none');
      svg.appendChild(linePath);
    } else if (chartType === 'candlestick') {
      drawCandlestickChart(svg, points, { width, height, padding, minPrice, maxPrice });
    }

    // Crosshair
    const crosshair = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    crosshair.setAttribute('stroke', '#9ca3af');
    crosshair.setAttribute('stroke-width', '1');
    crosshair.setAttribute('stroke-dasharray', '4 4');
    crosshair.style.display = 'none';
    svg.appendChild(crosshair);
    (crosshairRef as React.MutableRefObject<SVGLineElement>).current = crosshair;

    // X-axis labels
    const xLabelCount = Math.min(6, points.length);
    const xStep = Math.max(1, Math.floor(points.length / xLabelCount));
    for (let i = 0; i < points.length; i += xStep) {
      const point = points[i];
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', point.x.toString());
      text.setAttribute('y', (height - padding.bottom + 20).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '11px');
      text.setAttribute('fill', '#9ca3af');
      text.textContent = point.date.toLocaleDateString('mn-MN', { month: 'short', day: 'numeric' });
      svg.appendChild(text);
    }

  }, [svgRef, historyData, containerSize, activePeriod, chartType, drawCandlestickChart]);

  // Interaction handlers
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || pointsRef.current.length === 0) return;

    const handleInteraction = (clientX: number) => {
      const rect = svg.getBoundingClientRect();
      const x = clientX - rect.left;
      const closestPoint = pointsRef.current.reduce((prev, curr) => 
        (Math.abs(curr.x - x) < Math.abs(prev.x - x) ? curr : prev)
      );

      if (tooltipRef.current) {
        const tooltip = tooltipRef.current;
        tooltip.style.display = 'block';
        tooltip.innerHTML = `
          <div class="font-semibold text-sm text-white">₮${closestPoint.close.toLocaleString('mn-MN')}</div>
          <div class="flex items-center text-xs ${closestPoint.change >= 0 ? 'text-green-400' : 'text-red-400'}">
            <span class="mr-1">${closestPoint.change >= 0 ? '▲' : '▼'}</span>
            <span>${closestPoint.change.toFixed(2)} (${closestPoint.changePercent.toFixed(2)}%)</span>
          </div>
          <div class="text-gray-400 text-xs mt-1">Нээлт: ₮${closestPoint.open.toLocaleString('mn-MN')}</div>
          <div class="text-gray-400 text-xs">Дээд: ₮${closestPoint.high.toLocaleString('mn-MN')}</div>
          <div class="text-gray-400 text-xs">Доод: ₮${closestPoint.low.toLocaleString('mn-MN')}</div>
          <div class="text-gray-500 text-xs mt-1">${closestPoint.date.toLocaleDateString('mn-MN')}</div>
        `;

        const tooltipWidth = tooltip.offsetWidth;
        const containerWidth = rect.width;
        const gap = 15;
        let left = closestPoint.x < containerWidth / 2 
          ? closestPoint.x + gap 
          : closestPoint.x - tooltipWidth - gap;
        let top = closestPoint.y - 40;
        if (top < 5) top = 5;

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
      }

      if (crosshairRef.current) {
        crosshairRef.current.setAttribute('x1', closestPoint.x.toString());
        crosshairRef.current.setAttribute('y1', '20');
        crosshairRef.current.setAttribute('x2', closestPoint.x.toString());
        crosshairRef.current.setAttribute('y2', (svg.clientHeight - 40).toString());
        crosshairRef.current.style.display = 'block';
      }
    };

    const handleLeave = () => {
      if (tooltipRef.current) tooltipRef.current.style.display = 'none';
      if (crosshairRef.current) crosshairRef.current.style.display = 'none';
    };

    const handleMouseMove = (e: MouseEvent) => handleInteraction(e.clientX);
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) handleInteraction(e.touches[0].clientX);
    };

    svg.addEventListener('mousemove', handleMouseMove);
    svg.addEventListener('touchmove', handleTouchMove, { passive: false });
    svg.addEventListener('mouseleave', handleLeave);
    svg.addEventListener('touchend', handleLeave);

    return () => {
      svg.removeEventListener('mousemove', handleMouseMove);
      svg.removeEventListener('touchmove', handleTouchMove);
      svg.removeEventListener('mouseleave', handleLeave);
      svg.removeEventListener('touchend', handleLeave);
    };
  }, [historyData, activePeriod, containerSize]);

  if (historyData.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-gray-800 rounded-lg border border-gray-600">
        <div className="text-center text-gray-400">
          <p>Түүхийн мэдээлэл алга байна</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col bg-gray-800 rounded-lg border border-gray-600 p-4">
      {/* Chart Type & Period Toggles */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChartType('line')}
            className={`text-sm font-medium px-4 py-2 rounded-full transition-colors ${
              chartType === 'line'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Шугаман
          </button>
          <button
            onClick={() => setChartType('candlestick')}
            className={`text-sm font-medium px-4 py-2 rounded-full transition-colors ${
              chartType === 'candlestick'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Лаа
          </button>
        </div>

        <div className="flex items-center gap-2">
          {(['1M', '3M', '1Y', 'ALL'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setActivePeriod(p)}
              className={`text-xs font-medium px-4 py-2 rounded-full transition-colors ${
                activePeriod === p
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {p === 'ALL' ? 'Бүгд' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div
        ref={containerRef}
        className="w-full h-[350px] relative"
      >
        <svg
          ref={svgRef}
          className="w-full h-full cursor-crosshair"
          viewBox={`0 0 ${containerSize.width || 400} ${containerSize.height || 300}`}
          preserveAspectRatio="xMidYMid meet"
        />
        
        {isFallbackData && (
          <div className="absolute top-2 left-2 bg-yellow-900/80 text-yellow-300 text-xs font-medium px-2.5 py-0.5 rounded">
            Энэ үеийн мэдээлэл алга. Сүүлийн мэдээллийг харуулж байна.
          </div>
        )}

        <div
          ref={tooltipRef}
          className="absolute pointer-events-none bg-gray-900/95 border border-gray-700 rounded-lg px-3 py-2 z-10 shadow-lg"
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}

