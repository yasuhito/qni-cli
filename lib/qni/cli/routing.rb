# frozen_string_literal: true

module Qni
  # Shared routing helpers for top-level CLI startup and help display.
  module CliRouting
    HELP_TEXT_ROUTES = [
      %i[add_help_request? AddHelp],
      %i[clear_help_request? ClearHelp],
      %i[expect_help_request? ExpectHelp],
      %i[export_help_request? ExportHelp],
      %i[run_help_request? RunHelp],
      %i[state_help_request? StateHelp],
      %i[variable_help_request? VariableHelp]
    ].freeze
    USAGE_SUMMARIES = {
      'qni add ' => 'qni add',
      'qni expect ' => 'qni expect',
      'qni export ' => 'qni export',
      'qni run ' => 'qni run',
      'qni state ' => 'qni state',
      'qni variable ' => 'qni variable'
    }.freeze

    module_function

    def add_help_request?(given_args)
      [%w[add], %w[add --help], %w[add -h]].include?(given_args)
    end

    def expect_help_request?(given_args)
      [%w[expect], %w[expect --help], %w[expect -h]].include?(given_args)
    end

    def export_help_request?(given_args)
      [%w[export], %w[export --help], %w[export -h]].include?(given_args)
    end

    def run_help_request?(given_args)
      [%w[run --help], %w[run -h]].include?(given_args)
    end

    def clear_help_request?(given_args)
      [%w[clear --help], %w[clear -h]].include?(given_args)
    end

    def variable_help_request?(given_args)
      [%w[variable], %w[variable --help], %w[variable -h]].include?(given_args)
    end

    def state_help_request?(given_args)
      [%w[state], %w[state --help], %w[state -h]].include?(given_args)
    end

    def help_request?(given_args)
      given_args.first == 'help'
    end

    def help_text_for(given_args, cli_class:)
      help_constant = HELP_TEXT_ROUTES.find do |predicate, _constant_name|
        public_send(predicate, given_args)
      end&.last
      return nil unless help_constant

      cli_class.const_get(help_constant)::TEXT
    end

    def help_unavailable_message
      'qni help is not available; use qni or qni COMMAND --help'
    end

    def summarize_usage(usage)
      return nil if usage.start_with?('qni help')

      USAGE_SUMMARIES.find { |prefix, _summary| usage.start_with?(prefix) }&.last || usage
    end
  end
end
