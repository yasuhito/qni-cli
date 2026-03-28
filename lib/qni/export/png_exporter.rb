# frozen_string_literal: true

require 'fileutils'
require 'open3'
require 'tmpdir'

module Qni
  module Export
    # Compiles qcircuit LaTeX to PDF and converts it to PNG.
    class PngExporter
      CELL_SIZE_PX = 64

      # Temporary artifact locations for one export run.
      ArtifactPaths = Struct.new(:tex, :pdf, :png_base, :png) do
        def self.build(dir)
          base_path = File.join(dir, 'circuit')
          new(
            "#{base_path}.tex",
            "#{base_path}.pdf",
            base_path,
            "#{base_path}.png"
          )
        end
      end

      # Captured shell result used to build exporter error messages.
      class CommandResult
        def self.capture(command)
          stdout, stderr, status = Open3.capture3(*command)
          new(command_name: command.first, stdout:, stderr:, status:)
        end

        def initialize(command_name:, stdout:, stderr:, status:)
          @command_name = command_name
          @stdout = stdout
          @stderr = stderr
          @status = status
        end

        def success?
          status.success?
        end

        def missing_command?
          status.exitstatus == 127
        end

        def error_message(missing_message:)
          return missing_message if missing_command?

          detail = [stdout, stderr].map(&:to_s).map(&:strip).reject(&:empty?).join("\n")
          return "#{command_name} failed" if detail.empty?

          "#{command_name} failed: #{detail}"
        end

        private

        attr_reader :command_name, :status, :stderr, :stdout
      end

      def initialize(latex_source:, output_path:, target_width: nil, target_height: nil)
        @latex_source = latex_source
        @output_path = output_path
        @target_width = target_width
        @target_height = target_height
      end

      def export
        FileUtils.mkdir_p(File.dirname(output_path))

        Dir.mktmpdir('qni-export') { |dir| export_from(dir) }
      end

      private

      attr_reader :latex_source, :output_path, :target_height, :target_width

      def export_from(dir)
        paths = ArtifactPaths.build(dir)
        compile_artifacts(dir, paths)
        FileUtils.cp(paths.png, output_path)
      end

      def compile_artifacts(dir, paths)
        tex_path = paths.tex
        File.write(tex_path, latex_source)
        compile_pdf(dir, tex_path)
        convert_pdf_to_png(paths.pdf, paths.png_base)
      end

      def compile_pdf(dir, tex_path)
        run_command(
          ['pdflatex', '-interaction=nonstopmode', '-halt-on-error', '-output-directory', dir, tex_path],
          missing_message: 'pdflatex is required for qni export --png'
        )
      end

      def convert_pdf_to_png(pdf_path, png_base_path)
        run_command(
          pdf_to_png_command(pdf_path, png_base_path),
          missing_message: 'pdftocairo is required for qni export --png'
        )
      end

      def pdf_to_png_command(pdf_path, png_base_path)
        [
          *pdf_to_png_base_command,
          *pdf_to_png_size_args,
          pdf_path,
          png_base_path
        ]
      end

      def pdf_to_png_base_command
        ['pdftocairo', '-singlefile', '-png', '-transp', '-q']
      end

      def pdf_to_png_size_args
        return [] unless target_width && target_height

        ['-scale-to-x', target_width.to_s, '-scale-to-y', target_height.to_s]
      end

      def run_command(command, missing_message:)
        result = CommandResult.capture(command)
        return if result.success?

        raise result.error_message(missing_message:)
      rescue Errno::ENOENT
        raise missing_message
      end
    end
  end
end
