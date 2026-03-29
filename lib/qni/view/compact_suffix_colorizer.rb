# frozen_string_literal: true

module Qni
  module View
    # Applies dim ANSI formatting to compact suffix labels like Ry and T†.
    class CompactSuffixColorizer
      DIM_SUFFIX_PATTERN = /┤ ([A-Z])([xyz†])├/u
      DIM_WHITE = "\e[37;2m"
      RESET_FORMATTING = "\e[0m"

      def self.colorize(output)
        output.gsub(DIM_SUFFIX_PATTERN) do
          "┤ #{Regexp.last_match(1)}#{DIM_WHITE}#{Regexp.last_match(2)}#{RESET_FORMATTING}├"
        end
      end
    end
  end
end
