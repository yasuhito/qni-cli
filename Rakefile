# frozen_string_literal: true

require 'cucumber/rake/task'
require 'rubocop/rake_task'

desc 'Run RuboCop'
RuboCop::RakeTask.new(:rubocop) do |task|
  task.options = ['--cache-root', File.expand_path('tmp/rubocop-cache', __dir__)]
end

desc 'Run Cucumber features'
Cucumber::Rake::Task.new(:cucumber)

desc 'Run all checks'
task check: %i[rubocop cucumber]

task default: :check
