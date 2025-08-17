'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { examService } from '@/lib/api/examService';
import { ParsedCertificationInfo } from '@/lib/types';

export default function CertificationInfoPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const [certificationInfo, setCertificationInfo] = useState<ParsedCertificationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCertificationInfo = async () => {
      try {
        setIsLoading(true);
        const exam = await examService.getExamById(examId);
        
        if (exam && exam.certification_info) {
          setCertificationInfo(exam.certification_info);
        } else {
          setError('Certification information not found for this exam');
        }
      } catch (err) {
        setError('Failed to load certification information');
        console.error('Error loading certification info:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadCertificationInfo();
  }, [examId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading certification information...</div>
      </div>
    );
  }

  if (error || !certificationInfo) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {error || 'Certification information not available'}
            </h1>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6 mb-6 max-w-2xl mx-auto">
              <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-3">How to Add Certification Information</h3>
              <div className="text-sm text-yellow-700 dark:text-yellow-300 text-left space-y-2">
                <p>Certification information is stored in Supabase. To add or update:</p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Use the admin API to create/update certification info for exam ID <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">{examId}</code>.</li>
                  <li>Or insert a row into the <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">certification_info</code> table via the Supabase SQL Editor.</li>
                  <li>See setup steps in <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">SETUP-GUIDE.md</code> and data details in <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">MIGRATION.md</code>.</li>
                  <li>Refresh this page after changes.</li>
                </ol>
                <p className="mt-3 text-xs">
                  <strong>Note:</strong> This app reads certification info from Supabase in real time; no local JSON edits are required.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/exam/${examId}/setup`)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Back to Exam Setup
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          {/* Breadcrumb Navigation */}
          <nav className="mb-4">
            <ol className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <li>
                <button
                  onClick={() => router.push('/')}
                  className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                  Exams
                </button>
              </li>
              <li>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </li>
              <li>
                <button
                  onClick={() => router.push(`/exam/${examId}/setup`)}
                  className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                  {certificationInfo.title || `${certificationInfo.exam_code} Setup`}
                </button>
              </li>
              <li>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </li>
              <li className="text-gray-900 dark:text-white font-medium">
                Certification Info
              </li>
            </ol>
          </nav>

          <button
            onClick={() => router.push(`/exam/${examId}/setup`)}
            className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 mb-4 flex items-center"
          >
            <svg className="w-6 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            Back to {certificationInfo.title || 'Exam Setup'}
          </button>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-100 dark:border-gray-700">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {certificationInfo.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              {certificationInfo.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                {certificationInfo.exam_code}
              </span>
              <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium">
                {certificationInfo.level}
              </span>
              <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full text-sm font-medium">
                {certificationInfo.validity}
              </span>
            </div>
          </div>
        </div>

        {/* Exam Structure & Weightage */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Exam Structure & Weightage</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {certificationInfo.skills_measured.map((category, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white pr-4">{category.category}</h3>
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-bold">
                      {category.weightage}%
                    </div>
                    <div className="w-20 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${category.weightage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <ul className="space-y-2">
                  {category.skills.map((skill, skillIndex) => (
                    <li key={skillIndex} className="flex items-start text-sm text-gray-700 dark:text-gray-300">
                      <span className="text-blue-500 mr-3 mt-1 flex-shrink-0">•</span>
                      <span className="leading-relaxed">{skill}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Certification Details & Prerequisites */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Certification Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700 dark:text-gray-300">Exam Code:</span>
                <span className="text-gray-900 dark:text-white">{certificationInfo.exam_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700 dark:text-gray-300">Level:</span>
                <span className="text-gray-900 dark:text-white">{certificationInfo.level}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700 dark:text-gray-300">Validity:</span>
                <span className="text-gray-900 dark:text-white">{certificationInfo.validity}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700 dark:text-gray-300">Duration:</span>
                <span className="text-gray-900 dark:text-white">{certificationInfo.exam_details.duration}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700 dark:text-gray-300">Questions:</span>
                <span className="text-gray-900 dark:text-white">{certificationInfo.exam_details.questions}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700 dark:text-gray-300">Passing Score:</span>
                <span className="text-gray-900 dark:text-white">{certificationInfo.exam_details.passing_score}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700 dark:text-gray-300">Cost:</span>
                <span className="text-gray-900 dark:text-white">{certificationInfo.exam_details.cost}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Prerequisites</h3>
            <ul className="space-y-3">
              {certificationInfo.prerequisites.map((prereq, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-500 mr-3 mt-1 flex-shrink-0">•</span>
                  <span className="text-gray-700 dark:text-gray-300 leading-relaxed">{prereq}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Study Resources */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Study Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certificationInfo.study_resources.map((resource, index) => (
              <a
                key={index}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white text-lg">{resource.title}</h4>
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded text-sm">
                    {resource.type}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{resource.description}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Career Path */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Career Path</h2>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8">
              {certificationInfo.career_path.map((role, index) => (
                <div key={index} className="flex items-center">
                  <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <span className="ml-3 text-lg font-medium text-gray-700 dark:text-gray-300">{role}</span>
                  {index < certificationInfo.career_path.length - 1 && (
                    <svg className="w-6 h-6 text-gray-400 mx-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push(`/exam/${examId}/setup`)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-medium transition-colors text-lg"
          >
            Back to {certificationInfo.title || 'Exam Setup'}
          </button>
          <a
            href={certificationInfo.study_resources[0]?.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-medium transition-colors text-lg text-center"
          >
            Start Learning {certificationInfo.exam_code}
          </a>
        </div>
      </div>
    </div>
  );
} 