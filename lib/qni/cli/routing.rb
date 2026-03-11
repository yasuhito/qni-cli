# frozen_string_literal: true

module Qni
  # Shared routing helpers for top-level CLI startup and help display.
  module CliRouting
    module_function

    def add_help_request?(given_args)
      [%w[add], %w[add --help], %w[add -h]].include?(given_args)
    end

    def expect_help_request?(given_args)
      [%w[expect], %w[expect --help], %w[expect -h]].include?(given_args)
    end

    def clear_help_request?(given_args)
      [%w[clear --help], %w[clear -h]].include?(given_args)
    end

    def help_request?(given_args)
      given_args.first == 'help'
    end

    def help_unavailable_message
      'qni help is not available; use qni or qni COMMAND --help'
    end

    def summarize_usage(usage)
      return nil if usage.start_with?('qni help')
      return 'qni add' if usage.start_with?('qni add ')
      return 'qni expect' if usage.start_with?('qni expect ')

      usage
    end
  end
end
