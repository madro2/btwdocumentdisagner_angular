import { describe, expect, it } from 'vitest';
import { DesignContract } from '../../domain/models/template.model';
import { BindingEvaluatorService } from './binding-evaluator.service';
import { XmlDataSourceService } from './xml-data-source.service';

describe('BindingEvaluatorService', () => {
  it('resuelve el valor XML de una fila fija y no el nombre técnico del campo', () => {
    const evaluator = new BindingEvaluatorService(new XmlDataSourceService());
    evaluator.configure(contract());

    expect(
      evaluator.loadXml(
        '<NewDataSet><Customer><Name>Comercializadora Real S.A.S.</Name></Customer></NewDataSet>',
      ),
    ).toBeNull();

    expect(evaluator.hasLoadedXml()).toBe(true);
    expect(evaluator.render('{{Customer.Name}}')).toBe(
      'Comercializadora Real S.A.S.',
    );
  });
});

function contract(): DesignContract {
  return {
    schemaVersion: '3.0',
    document: { id: 'test', name: 'Prueba', version: 1 },
    page: {
      size: 'A4',
      orientation: 'portrait',
      widthMm: 210,
      heightMm: 297,
      unit: 'mm',
      marginsMm: { top: 7, right: 7, bottom: 7, left: 7 },
    },
    dataSource: {
      rootPath: '/NewDataSet',
      tables: [
        {
          name: 'Customer',
          dataPath: 'Customer',
          cardinality: 'zeroOrOne',
        },
      ],
    },
    components: [],
  };
}
