import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { EChartsOption } from 'echarts';

@Component({
  selector: 'app-ai-explanation',
  templateUrl: './ai-explanation.component.html',
  styleUrls: ['./ai-explanation.component.css']
})
export class AiExplanationComponent implements OnChanges {
  @Input() explanation: string[] = [];     // default empty array
  @Input() decision: string = '';          // default empty string
  @Input() riskScore: number = 0;          // default zero

  // chartOption can be undefined until updateChart runs
  chartOption: EChartsOption | undefined = undefined;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['explanation'] || changes['riskScore']) {
      this.updateChart();
    }
  }

  updateChart(): void {
    // typed mapping
    const contributionMapping: Record<string, number> = {
      "Transaction amount": 0.35,
      "Unrecognized device": 0.25,
      "Foreign country": 0.25,
      "high-risk activity": 0.20,
      "Impossible travel": 0.40
    };

    const chartData = this.explanation
        .map(reason => {
            for (const key in contributionMapping) {
                if (Object.prototype.hasOwnProperty.call(contributionMapping, key) && reason.includes(key)) {
                    return { name: key, value: contributionMapping[key] };
                }
            }
            return null;
        })
        .filter((item): item is { name: string; value: number } => item !== null);


    this.chartOption = {
      tooltip: {
        trigger: 'item'
      },
      legend: {
        top: '5%',
        left: 'center',
        textStyle: { color: '#fff' }
      },
      series: [
        {
          name: 'Risk Contribution',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '20',
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          // cast to any to satisfy ECharts typings for pie data items
          data: chartData as any
        }
      ]
    };
  }

  getDecisionClass(decision: string): string {
    switch (decision) {
      case 'APPROVE':
        return 'decision-approve';
      case 'FLAG':
        return 'decision-flag';
      case 'BLOCK':
        return 'decision-block';
      default:
        return '';
    }
  }
}