# frozen_string_literal: true

module Qni
  # Shared class-level startup and help behavior for the Thor CLI.
  module CliBootstrap
    def start(given_args = ARGV, config = {})
      if (help_text = CliRouting.help_text_for(given_args, cli_class: self))
        return $stdout.puts(help_text)
      end

      if CliRouting.help_request?(given_args)
        warn(CliRouting.help_unavailable_message)
        exit(1)
      end

      super
    end

    def printable_commands(...)
      super.reject { |item| item.first.start_with?('qni tree') }
           .filter_map do |usage, description|
             summarized_usage = CliRouting.summarize_usage(usage)
             [summarized_usage, description] if summarized_usage
           end
    end
  end
end
