import { describe, it, expect } from 'vitest';
import {
  FileUploader,
  ProgressIndicator,
  ReportExporter,
  SUPPORTED_FORMATS,
} from '../index';

describe('Shared Frontend Components', () => {
  
  describe('FileUploader', () => {
    it('should be a valid React component', () => {
      expect(typeof FileUploader).toBe('function');
    });

    it('should export SUPPORTED_FORMATS', () => {
      expect(SUPPORTED_FORMATS).toBeDefined();
      expect(SUPPORTED_FORMATS.PDF).toBeDefined();
      expect(SUPPORTED_FORMATS.EPUB).toBeDefined();
      expect(SUPPORTED_FORMATS.DOCX).toBeDefined();
    });
  });

  describe('ProgressIndicator', () => {
    it('should be a valid React component', () => {
      expect(typeof ProgressIndicator).toBe('function');
    });
  });

  describe('ReportExporter', () => {
    it('should be a valid React component', () => {
      expect(typeof ReportExporter).toBe('function');
    });
  });

  describe('Index exports', () => {
    it('should export all components', async () => {
      const shared = await import('../index');
      
      expect(shared.FileUploader).toBeDefined();
      expect(shared.ProgressIndicator).toBeDefined();
      expect(shared.ReportExporter).toBeDefined();
    });
  });
});
